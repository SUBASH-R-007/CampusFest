<?php
declare(strict_types=1);

namespace CampusFest;

class DemoSeed
{
    public static function build(?\DateTimeImmutable $clock = null): array
    {
        $now = ($clock ?? new \DateTimeImmutable('now'))->setTimezone(new \DateTimeZone('UTC'));
        $at = fn (string $relative) => $now->modify($relative)->format('Y-m-d\TH:i:s\Z');
        $state = JsonStore::emptyState();
        $state['demo'] = true;
        $state['seededAt'] = $at('+0 seconds');
        $state['organizers'] = [
            ['id' => 'ORG-DEMO-TECH', 'name' => 'Aarav — Demo organizer', 'email' => 'organizer@campusfest.test', 'passwordHash' => password_hash('CampusFest!2026', PASSWORD_DEFAULT)],
            ['id' => 'ORG-DEMO-ARTS', 'name' => 'Mira — Arts organizer', 'email' => 'arts@campusfest.test', 'passwordHash' => password_hash('ArtsFest!2026', PASSWORD_DEFAULT)],
        ];
        $event = static function (string $slug, string $title, string $category, string $image, string $description, string $venue, array $overrides = []) use ($at): array {
            return array_replace([
                'id' => 'EVT-' . strtoupper($slug), 'ownerId' => 'ORG-DEMO-TECH', 'title' => $title, 'slug' => $slug,
                'category' => $category, 'description' => $description . "\n\nThis is a fictional CampusFest demo event.",
                'rules' => 'Bring your college ID for the in-person demo. Arrive 15 minutes before the scheduled start. Respect fellow participants and the venue.',
                'venue' => $venue, 'image' => $image, 'startAt' => $at('+7 days'), 'endAt' => $at('+7 days +3 hours'),
                'registrationOpensAt' => $at('-7 days'), 'registrationDeadline' => $at('+6 days'),
                'mode' => 'SOLO', 'capacity' => 40, 'minTeamSize' => 1, 'maxTeamSize' => 1,
                'contact' => 'Demo event desk · events@example.edu', 'status' => 'published', 'registrationsEnabled' => true,
            ], $overrides);
        };
        $state['events'] = [
            $event('codesprint', 'CodeSprint', 'Technology', '/images/code.jpg', 'A focused afternoon of creative problem solving. Pair curiosity with code, work through a series of challenges, and share what you learned with the campus community.', 'Innovation Lab · Block A', ['capacity' => 3, 'startAt' => $at('+3 days'), 'endAt' => $at('+3 days +4 hours'), 'registrationDeadline' => $at('+2 days')]),
            $event('design-jam', 'Design Jam', 'Design', '/images/design.jpg', 'Make everyday campus life a little better. Form a team, explore a real design problem, sketch a thoughtful solution, and present a prototype at the final showcase.', 'Design Studio · Creative Block', ['mode' => 'TEAM', 'capacity' => 12, 'minTeamSize' => 2, 'maxTeamSize' => 4, 'startAt' => $at('+5 days'), 'endAt' => $at('+5 days +5 hours'), 'registrationDeadline' => $at('+4 days')]),
            $event('robo-rally', 'RoboRally', 'Technology', '/images/code.jpg', 'The robotics floor is open. Meet student makers, compare small autonomous builds, and take part in practical robotics demonstrations. This ongoing demo event is ready for attendance check-in.', 'Robotics Workshop · Block B', ['capacity' => 20, 'startAt' => $at('-1 hour'), 'endAt' => $at('+5 hours'), 'registrationDeadline' => $at('-2 hours')]),
            $event('lenscraft', 'LensCraft', 'Arts', '/images/campus.jpg', 'Find an unexpected point of view on familiar spaces. This guided photo walk is a chance to explore composition, light, and storytelling with fellow campus photographers.', 'Meet at the Library Courtyard', ['registrationsEnabled' => false, 'startAt' => $at('+4 days'), 'endAt' => $at('+4 days +2 hours'), 'registrationDeadline' => $at('+3 days')]),
            $event('open-mic', 'Open Mic', 'Culture', '/images/stage.jpg', 'An evening for original voices. Share a song, a poem, a short story, or a few minutes of stand-up on a welcoming student stage. Every performance adds something different.', 'The Amphitheatre', ['ownerId' => 'ORG-DEMO-ARTS', 'capacity' => 24, 'startAt' => $at('+6 days'), 'endAt' => $at('+6 days +3 hours'), 'registrationDeadline' => $at('+5 days')]),
            $event('debate-arena', 'Debate Arena', 'Literary', '/images/campus.jpg', 'Practice making a clear case and listening carefully to another. Teams explore a topical motion through structured rounds and supportive feedback.', 'Seminar Hall · Block C', ['ownerId' => 'ORG-DEMO-ARTS', 'status' => 'draft', 'mode' => 'TEAM', 'minTeamSize' => 2, 'maxTeamSize' => 2, 'capacity' => 8]),
            $event('past-showcase', 'Campus Makers Showcase', 'Design', '/images/design.jpg', 'A look back at student experiments, working prototypes, and the ideas that brought people together. This completed demo event remains available as an event history example.', 'Exhibition Hall', ['ownerId' => 'ORG-DEMO-ARTS', 'startAt' => $at('-3 days'), 'endAt' => $at('-3 days +3 hours'), 'registrationOpensAt' => $at('-14 days'), 'registrationDeadline' => $at('-4 days')]),
            $event('two-seat-lab', 'The Two-Seat Lab', 'Workshop', '/images/design.jpg', 'A small, hands-on workshop for trying the complete registration journey. There are exactly two seats. The next participant joins the waiting list and moves up automatically when a confirmed place is cancelled.', 'Learning Studio · Block A', ['capacity' => 2, 'startAt' => $at('+2 days'), 'endAt' => $at('+2 days +2 hours'), 'registrationDeadline' => $at('+1 day')]),
        ];
        $add = static function (string $slug, string $name, string $status = 'CONFIRMED', array $more = []) use (&$state, $at): void {
            $sequence = $state['nextRegistrationSequence']++;
            $member = static fn (string $person, int $number) => ['id' => 'MEM-DEMO-' . $number, 'name' => $person,
                'studentId' => 'DEMO' . str_pad((string) $number, 4, '0', STR_PAD_LEFT), 'email' => 'student' . $number . '@example.edu',
                'department' => 'Computer Science', 'year' => 2, 'attendance' => null];
            $members = [$member($name, $sequence * 10)];
            foreach ($more as $index => $person) {
                $members[] = $member($person, $sequence * 10 + $index + 1);
            }
            $state['registrations'][] = ['passId' => 'CF-DEMO-' . str_pad((string) $sequence, 4, '0', STR_PAD_LEFT), 'eventId' => 'EVT-' . strtoupper($slug),
                'teamName' => $more ? 'Studio ' . $sequence : '', 'status' => $status, 'sequence' => $sequence,
                'leaderId' => $members[0]['id'], 'members' => $members, 'managementCodeHash' => hash('sha256', bin2hex(random_bytes(32))),
                'createdAt' => $at(($slug === 'past-showcase' ? '-5 days +' : '-2 days +') . $sequence . ' minutes'), 'cancelledAt' => null, 'cancellationReason' => null, 'promotedAt' => null];
        };
        foreach (['Aditi Rao', 'Kabir Shah', 'Neha Sen'] as $name) { $add('codesprint', $name); }
        foreach (['Ishaan Das', 'Riya Mehta', 'Dev Patel'] as $name) { $add('codesprint', $name, 'WAITLISTED'); }
        $add('design-jam', 'Anika Roy', 'CONFIRMED', ['Vivan Jain', 'Sana Ali']);
        foreach (['Arjun Nair', 'Leela Bose', 'Rohan Iyer'] as $name) { $add('robo-rally', $name); }
        $add('lenscraft', 'Tara Menon');
        $add('open-mic', 'Nila Kapoor');
        $add('past-showcase', 'Milan Joshi');
        $state['auditLog'][] = ['at' => $at('+0 seconds'), 'action' => 'demo.seeded', 'actor' => 'cli', 'target' => 'demo', 'details' => []];
        return $state;
    }
}
