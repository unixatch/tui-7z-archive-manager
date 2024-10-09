# CHANGELOG v.1.3.5

- Adding a new command: **rename archive** + documentation;
  - Added a new shortcut: **_Shift + r_**;

- Added minimum **nodejs** version requirement;

- Renamed _createConfigJSON.mjs_ to _postinstall.mjs_
because it does more than it used to;

- Added a new tool for writing changelogs;

- Installation changes:
  - Added **auto-completion** files installation;
  - **bash** and **zsh** are supported;
  - now before installing or updating, it'll ask for permission;
  - now installations show a successuful message at the end;

- Added 4 QoL keys for 3 prompts:
  - **Home key**: goes to the top;
  - **End key**: goes to the bottom;
  - **Pageup key**: goes up by 3 items;
  - **Pagedown key**: goes down by 3 items;

- Simplified some regex;

- Changing _select_ prompt to a DIY one
because it couldn't clean the screen properly;
- moved around some cleaning functions;

- Moved all regexes regarding archive support to their own object for readability and performance;

- More asynchronous dynamic imports:
  - moved all modified prompts to separate files;
  - added asynchronous imports to the main script;

- Revamped line cleanups:
  - cleanups are now dynamically calculated instead of using static integers;
  - removed some unnecessary cleanups at the beginning;
  - removed duplicated messages;

- Fixed double rendering when closing normally;

- Fixed the path parameter for Termux:
  - **_/storage/emulated_** can't be used for permissions reasons,
  so it replaces it with Termux's provided linked path;

- Fixed the cut command since it was mistakenly using async with forEach,
so it was changed to a _for...of_ loop instead;

# CHANGELOG v.1.3.0

- Added an **open** command;
- Added a counter to the info command;

- Added new shortcuts to the info command:
  1. "**go to top**" and "**go to bottom**" shortcuts;
  2. **pageup** and **pagedown** shortcuts (skips 3 items);

- Added a **search** command for filtering the list of items inside the archive;
- Added a new config option for recursive search (_default: true_);

- Added 2 new parameters for forcing a recursive search or not:
  1. **--recursive**|**/recursive**|**-r**|**/r**;
  2. **--no-recursive**|**/no-recursive**|**-nr**|**/nr**;

- Fixed a crash caused by pressing tab on a folder that has its "children" property not yet prepared;
- Fixed some prompts not cleaning their events properly;

- Small fixes:
  1. Fixed the lingering dot when trying to move something if esc is pressed;
  3. Fixed a regex detection for Windows regarding the back parameter;
  4. Fixed some cleaning actions;
  5. Fixed some prompt messages having an unnecessary space;

# CHANGELOG v.1.2.0

- Added more examples for how to set 7z globally and added the shortcuts inside the _README_ file;
- Added new commands: **info**, **create** and **help** (shortcuts only);
- Added new shortcuts for the new commands added;
- Added 2 new options:
  1. **skipToNewlyCreatedArchive**: when you finish creating the new archive, it'll show its contents directly;
  2. **backToMenuAfterCreatedArchive**: after creating the new archive, it just goes back to show the current archive instead of the new one;

- These new options have also parameters associated with them that also override them:
  1. **--skip**|**/skip**|**-s**|**/s**;
  2. **--back**|**/back**|**-b**|**/b**;

- Added new checks for options taken from config file;
- Now there's an help text for shortcuts;
- Moved shortcuts from if conditions to the switch for performance reasons inside the _complete_ keyboard event;
- Added a new function for detecting wrapped lines, that means that in the future line wraps can be accounted dynamically;
- Fixed 1 select prompt's page size so that it can be seen at once;
- Fixed press-to-continue prompts so that they get cleaned correctly;

# CHANGELOG v.1.1.1

- Fixed how the list of soon-to-be deleted 📄/📂 shown on screen trims long names;

- Modified how 7z commands are run;

- Fixed some regex detections;

- Fixed some unexpected slashes at the end of paths for the algorithm;

- Added new waiting messages while waiting for 7z commands to finish their work;

- Added a lot of 7z supported formats that "7z i" reports;

- Improved loading times on certain actions;

# CHANGELOG v.1.1.0

- Fixed Windows compatibility by changing the slash in the regex dynamically;

- Added a new user option for the page size of prompts;

- Fixed a slowdown caused by a regex replacement;

- Fixed some cleaning of the screen not done right;

- Added new shortcuts for skipping certain prompts and go directly to the point;

- Added the rename command;

- Added some more checks for input prompts;

- Removed an unused property from "changeArchive()";

- Added a "Loading list..." text for when there's to wait;

- Fixed an issue where identical subfolder names with different paths could clash against eachother and cause inaccurate listing;

# CHANGELOG v.1.0.0

- Initial release;