// Run from repo root: PHP_BINARY=/path/to/php node backend/tests/http.mjs
// Creates and removes only a uniquely named temporary fixture; never uses demo data.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const testRoot = resolve(root, '.runtime');
await mkdir(testRoot, { recursive: true });
const storage = await mkdtemp(resolve(testRoot, 'campusfest-http-'));
const php = process.env.PHP_BINARY || 'php';
const fixture = spawnSync(php, ['backend/tests/http-fixture.php', storage], { cwd: root, encoding: 'utf8' });
assert.equal(fixture.status, 0, fixture.stderr + fixture.stdout);
const socket = net.createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port; await new Promise(r => socket.close(r));
const base = `http://127.0.0.1:${port}`;
let server, output = '', checks = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function check(condition, message) { assert.ok(condition, message); checks++; console.log(`PASS ${message}`); }
async function start() {
  server = spawn(php, ['-S', `127.0.0.1:${port}`, '-t', 'backend/public', 'backend/public/router.php'], {
    cwd: root, env: { ...process.env, CAMPUSFEST_STORAGE: storage, CAMPUSFEST_SESSION_IDLE_SECONDS: '3' }, stdio: ['ignore','pipe','pipe'], windowsHide: true,
  });
  server.stdout.on('data', d => { output += d; }); server.stderr.on('data', d => { output += d; });
  for (let n = 0; n < 60; n++) {
    try { if ((await fetch(`${base}/api/session`)).status === 200) return; } catch { /* wait for owned server */ }
    if (server.exitCode !== null) throw new Error(output);
    await sleep(100);
  }
  throw new Error('HTTP server did not start: ' + output);
}
async function stop() { if (server && server.exitCode === null) { server.kill(); await once(server, 'exit'); } }
class Client {
  cookie = ''; csrf = '';
  async request(path, method = 'GET', body, extra = {}) {
    const response = await fetch(base + path, { method, headers: {
      Cookie: this.cookie, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-CSRF-Token': this.csrf } : {}), ...extra,
    }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const cookie = response.headers.getSetCookie()[0]; if (cookie) this.cookie = cookie.split(';')[0];
    const content = await response.text(); let json;
    try { json = JSON.parse(content); } catch { /* CSV or HTML */ }
    if (json?.data?.csrfToken) this.csrf = json.data.csrfToken;
    return { status: response.status, data: json?.data, error: json?.error, text: content, headers: response.headers };
  }
  async session() { return this.request('/api/session'); }
  async login(who = 'one') { await this.session(); return this.request('/api/session/login', 'POST', {email:`${who}@example.test`, password:'Test-password-42!'}); }
}
const date = offset => new Date(Date.now() + offset * 3600000).toISOString();
const eventInput = overrides => ({ title:'HTTP Test Event',slug:'http-test',category:'Technology',description:'Synthetic HTTP fixture',rules:'Bring your pass.',venue:'Demo room',image:'/images/code.jpg',startAt:date(24),endAt:date(26),registrationOpensAt:date(-24),registrationDeadline:date(20),mode:'SOLO',capacity:2,minTeamSize:1,maxTeamSize:1,contact:'one@example.test',...overrides });
const member = (id, name = `Fictional ${id}`) => ({name,studentId:`TEST-${id}`,email:`${id}@example.test`,department:'Computing',year:2});
try {
  await start();
  const anonymous = new Client(), owner = new Client(), other = new Client();
  let response = await anonymous.session();
  check(response.status === 200 && response.data.organizer === null, 'anonymous session and CSRF token');
  check(response.headers.get('cache-control') === 'no-store', 'private responses are no-store');
  check((await anonymous.request('/api/organizer/events')).status === 401, 'organizer routes require authentication');
  check((await anonymous.request('/api/session/login','POST',{email:'one@example.test',password:'Test-password-42!'},{'X-CSRF-Token':''})).status === 403, 'login missing CSRF rejected');
  check((await anonymous.request('/api/session/login','POST',{email:'one@example.test',password:'wrong'})).status === 401, 'incorrect login rejected');
  check((await anonymous.request('/api/passes/lookup','POST',[])).status === 400, 'non-object JSON rejected');
  check((await anonymous.request('/api/passes/lookup','POST',{passId:'CF-test',managementCode:'x'.repeat(66000)})).status === 413, 'oversized request rejected');
  await owner.session(); const preLoginCookie = owner.cookie;
  response = await owner.login();
  check(response.status === 200 && owner.cookie !== preLoginCookie, 'login succeeds and regenerates session ID');
  const cookies = response.headers.get('set-cookie');
  check(/HttpOnly/i.test(cookies) && /SameSite=Lax/i.test(cookies), 'HttpOnly and SameSite cookies');
  await other.login('two');
  response = await owner.request('/api/organizer/events','POST',eventInput({ownerId:'ORG-two',status:'published'}));
  check(response.status === 201 && response.data.status === 'draft', 'new events are server-owned drafts despite privileged input');
  const event = response.data;
  await owner.request(`/api/organizer/events/${event.id}/action`,'POST',{action:'publish'});
  const wrongOwner = await other.request(`/api/organizer/events/${event.id}/registrations`);
  check([403,404].includes(wrongOwner.status), 'other organizer cannot read roster');
  check([403,404].includes((await other.request(`/api/organizer/events/${event.id}/export.csv`)).status), 'other organizer cannot export');
  check([403,404].includes((await other.request(`/api/organizer/events/${event.id}`,'PUT',eventInput())).status), 'other organizer cannot edit');
  check((await anonymous.request('/api/events/http-test/registrations','POST',{consent:true,members:[member('A')]},{'X-CSRF-Token':'invalid'})).status === 403, 'registration invalid CSRF rejected');
  const passes = [];
  for (const id of ['A','B','C','D']) {
    response = await anonymous.request('/api/events/http-test/registrations','POST',{consent:true,members:[member(id)],status:'CONFIRMED'});
    assert.equal(response.status,201,response.text); passes.push(response.data);
  }
  check(passes.map(p=>p.registration.status).join(',') === 'CONFIRMED,CONFIRMED,WAITLISTED,WAITLISTED', 'capacity TWO confirms two and queues two');
  check(passes[2].registration.waitlistPosition===1 && passes[3].registration.waitlistPosition===2,'FIFO positions come from server');
  for (const [action, body] of [['cancel',{}],['rotate-code',{verified:true}],['attendance',{memberId:passes[0].registration.members[0].id,undo:false}]]) {
    check([403,404].includes((await other.request(`/api/organizer/registrations/${passes[0].registration.passId}/${action}`,'POST',body)).status), `other organizer cannot ${action}`);
  }
  check((await anonymous.request('/api/events/http-test/registrations','POST',{consent:true,members:[member('a')]})).status===409,'normalized duplicate rejected via HTTP');
  const access = p => ({passId:p.registration.passId,managementCode:p.managementCode});
  check((await anonymous.request('/api/passes/lookup','POST',{...access(passes[0]),managementCode:'wrong'})).status>=400,'incorrect private code denied');
  const cancelled = await anonymous.request('/api/passes/cancel','POST',access(passes[0]));
  check(cancelled.data.registration.status === 'CANCELLED','student cancellation persists');
  await anonymous.request('/api/passes/cancel','POST',access(passes[0]));
  response = await anonymous.request('/api/passes/lookup','POST',access(passes[2]));
  check(response.data.registration.status === 'CONFIRMED','oldest waitlisted student promoted');
  response = await anonymous.request('/api/passes/lookup','POST',access(passes[3]));
  check(response.data.registration.waitlistPosition === 1 && response.data.registration.status === 'WAITLISTED','repeated cancellation does not promote another entry');
  response = await owner.request(`/api/organizer/registrations/${passes[1].registration.passId}/rotate-code`,'POST',{verified:true});
  check(typeof response.data.managementCode === 'string','organizer issues a new private code');
  check((await anonymous.request('/api/passes/lookup','POST',access(passes[1]))).status>=400,'old private code invalidated');
  passes[1].managementCode = response.data.managementCode;
  check((await anonymous.request('/api/passes/lookup','POST',access(passes[1]))).status===200,'replacement private code works');
  response = await anonymous.request('/api/events');
  check(!/passwordHash|managementCode|TEST-A|example\.test.*studentId/.test(response.text),'public events exclude private records');
  const beforeReads = await readFile(resolve(storage,'state.json'),'utf8');
  await anonymous.request('/api/events/http-test'); await owner.request('/api/organizer/dashboard');
  check(beforeReads === await readFile(resolve(storage,'state.json'),'utf8'), 'GET event/dashboard reads leave canonical state unchanged');
  for (const path of ['/storage/state.json','/backend/storage/state.json','/.git/config','/src/bootstrap.php']) check((await anonymous.request(path)).status === 404,`private URL denied: ${path}`);
  response = await anonymous.request('/api/not-a-route');
  check(response.status===404 && response.error?.code==='NOT_FOUND','unknown API returns JSON 404');
  response = await owner.request('/api/organizer/dashboard');
  check(response.data.stats.confirmed===2 && response.data.stats.waitlisted===1 && response.data.stats.events===1,'dashboard returns real owned counts');
  await stop(); await start();
  response = await anonymous.request('/api/passes/lookup','POST',access(passes[2]));
  check(response.data.registration.status==='CONFIRMED','registration state survives backend restart');
  await owner.login();
  const teamData = eventInput({slug:'http-team',title:'HTTP Team Event',mode:'TEAM',capacity:1,minTeamSize:2,maxTeamSize:3});
  response = await owner.request('/api/organizer/events','POST',teamData); const team = response.data;
  await owner.request(`/api/organizer/events/${team.id}/action`,'POST',{action:'publish'});
  response = await anonymous.request('/api/events/http-team/registrations','POST',{consent:true,teamName:'Test team',members:[member('T1','=1+1'),member('T2','Name, "quoted"')]});
  check(response.status===201 && response.data.registration.members.length===2 && response.data.event.confirmedCount===1,'team members consume one capacity unit');
  const teamPass = response.data;
  const fixtureState = JSON.parse(await readFile(resolve(storage,'state.json'),'utf8'));
  // Move time boundaries through supported event editing; preserve registration history.
  response = await owner.request(`/api/organizer/events/${team.id}`,'PUT',{...teamData,registrationOpensAt:date(-24),registrationDeadline:date(-2),startAt:date(-1),endAt:date(1)});
  assert.equal(response.status,200,response.text);
  const attendancePath = `/api/organizer/registrations/${teamPass.registration.passId}/attendance`;
  const attendanceBody = {memberId:teamPass.registration.members[1].id,undo:false};
  response = await owner.request(attendancePath,'POST',attendanceBody); const at = response.data.registration.members[1].attendance.at;
  response = await owner.request(attendancePath,'POST',attendanceBody);
  check(response.data.registration.members[1].attendance.at===at && response.data.event.checkedInCount===1,'repeated team-member check-in preserves one attendance record');
  response = await owner.request(`/api/organizer/events/${team.id}/export.csv`);
  check(response.status===200 && response.headers.get('content-type').includes('text/csv') && response.text.includes("'=1+1") && response.text.includes('"Name, ""quoted"""'),'CSV escaping and formula injection protection');
  response = await owner.request(attendancePath,'POST',{...attendanceBody,undo:true});
  check(response.data.event.checkedInCount===0 && response.data.registration.members[1].attendance===null,'attendance undo updates counts');
  check(fixtureState.registrations.length===5,'fixture persists all registration records');
  response = await owner.request('/api/session/logout','POST',{});
  check(response.status===200 && (await owner.request('/api/organizer/events')).status===401,'logout invalidates authentication');
  await owner.login(); await sleep(3200);
  check((await owner.request('/api/organizer/events')).status===401,'idle session expiry is enforced');
  await anonymous.session();
  for (let i=0;i<15;i++) response = await anonymous.request('/api/session/login','POST',{email:'missing@example.test',password:'wrong'});
  check(response.status===429,'login throttling returns HTTP 429');
  const stored = JSON.parse(await readFile(resolve(storage,'state.json'),'utf8'));
  check(stored.auditLog.length>0 && !JSON.stringify(stored).includes(passes[1].managementCode),'private code absent from persistent state and audit exists');
  const deepLink = await anonymous.request('/events/http-test');
  check(deepLink.status===200 && deepLink.text.includes('<div id="root">'),'production SPA deep link serves built frontend');
  console.log(`\n${checks} HTTP integration checks passed.`);
} finally {
  await stop();
  if (dirname(storage) !== testRoot || !basename(storage).startsWith('campusfest-http-')) throw new Error('Unsafe test cleanup path');
  await rm(storage,{recursive:true,force:true});
}
