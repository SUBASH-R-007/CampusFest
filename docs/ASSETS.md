# Local asset attribution

CampusFest includes four real photographs downloaded from Unsplash on 12 October 2026. Their individual source pages identify them as free under the [Unsplash License](https://unsplash.com/license). That license permits downloading, copying, modifying and distributing photographs for commercial or noncommercial use; it does not permit selling unmodified images or compiling a competing image service. These third-party photographs retain their own license; the repository's software license does not replace it.

All photographs are stored locally in `frontend/public/images/`. Vite copies them into the build. The application does not call Unsplash or require image-CDN access at runtime. Each download requested a maximum width of 1,800 pixels, JPEG format, and quality 85. Card crops are made by CSS, not by modifying the source photograph.

| Local asset | Photographer | Exact source | Subject |
| --- | --- | --- | --- |
| `campus.jpg` | Zoshua Colah | [Students study in a beautiful, old library](https://unsplash.com/photos/students-study-in-a-beautiful-old-library-JcPr4irSk34) | Suzzallo Library interior, University of Washington |
| `code.jpg` | Markus Spiske | [Code on a computer](https://unsplash.com/photos/code-on-a-computer-AaEQmoufHLk) | Source code on a screen |
| `stage.jpg` | Jonathan Ikemura | [Crowd with hands up at a bright concert stage](https://unsplash.com/photos/crowd-with-hands-up-at-a-bright-concert-stage-z0R4XB25ozI) | Monochrome concert crowd |
| `design.jpg` | Debby Hudson | [Colored pencils in top view photography](https://unsplash.com/photos/colored-pencils-in-top-view-photography-FsrRDNVBS2Y) | Colored pencils in a jar |

Download image identifiers, recorded for reproducibility:

```text
campus: https://images.unsplash.com/photo-1741707596397-efaae09503b5?auto=format&fit=crop&fm=jpg&q=85&w=1800
code:   https://images.unsplash.com/photo-1504164996022-09080787b6b3?auto=format&fit=crop&fm=jpg&q=85&w=1800
stage:  https://images.unsplash.com/photo-1778011390422-a4d4bd8936a7?auto=format&fit=crop&fm=jpg&q=85&w=1800
design: https://images.unsplash.com/photo-1518367762352-defc3c7f237a?auto=format&fit=crop&fm=jpg&q=85&w=1800
```

The images illustrate fictional demo events. They do not depict actual CampusFest events and imply no endorsement from photographers, pictured people, institutions, or venues. There is no fabricated college logo. System fonts avoid an external font dependency.
