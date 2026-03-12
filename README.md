# Idea Lab — DBIT

Team formation platform for first-year students at Don Bosco Institute of Technology, Mumbai. Students self-organize into cross-branch teams of 6 members, with real-time constraint validation and admin oversight.

---

## Table of Contents

- [Overview](#overview)
- [Student Flow](#student-flow)
- [Admin Flow](#admin-flow)
- [Team Constraints](#team-constraints)
- [CSV Format](#csv-format)
- [USN Format & Branch Mapping](#usn-format--branch-mapping)
- [Data Flows](#data-flows)
- [Gate Control System](#gate-control-system)
- [Firestore Schema](#firestore-schema)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## Overview

Idea Lab enables ~825 first-year students across 7 branches to form cross-disciplinary teams of 6. The platform replaces manual team assignment with a self-service model:

1. Admin uploads student CSV master data
2. Students register using their USN (validated against CSV)
3. Students create teams or browse/join existing ones
4. Team leads manage invites and join requests
5. Admin monitors progress with real-time stats and gate controls

---

## Student Flow

### 1. Registration (`/register`)

```
Student enters USN
        |
        v
Format validation (1DB25XX###)
        |
        v
Firestore lookup: students/{USN}
        |
    +---+---+
    |       |
  Found   Not found
    |       |
    v       v
Auto-fill   "USN not found in
name,       student database.
email,      Contact admin."
phone       (blocked)
    |
    v
Student confirms details
    |
    v
Write to registrations/{USN}
    |
    v
Create localStorage session
    |
    v
Redirect to /dashboard
```

- USN must exist in the `students` collection (CSV-imported) — strict validation
- If already registered, creates session from existing data and redirects
- Name, email, phone auto-filled from CSV; phone is editable and required (10 digits)
- Branch and section derived from USN automatically

### 2. Dashboard (`/dashboard`)

The student home page showing:
- Welcome message with name and branch
- Current team status (if on a team)
- Pending invites received (accept/reject)
- Quick actions: Create Team, Browse Teams, View Team

### 3. Create Team (`/team/create`)

```
Student clicks "Create Team"
        |
        v
Check: teamFormationOpen gate
        |
    +---+---+
    |       |
  Open    Closed
    |       |
    v       v
Show form  "Team Formation
    |       Closed" (locked)
    v
Set team name (optional)
Set visibility (public/private)
        |
        v
Generate TEAM-XXXX ID
        |
        v
Write teams/{TEAM-XXXX} doc
Update registrations/{USN}.teamId
Update localStorage session
        |
        v
Redirect to /team/{TEAM-XXXX}
```

- Student becomes **team lead**
- Team starts with 1 member (the lead) in "forming" status
- Public teams appear in browse; private teams are invite-only

### 4. Team Management (`/team/[teamId]`)

**Team Lead can:**
- Invite members by USN (creates invite doc, type: "invite")
- Approve/reject join requests from browse page
- See real-time constraint indicator (branch slots, EEE/ECE check)

**All Members can:**
- View team members with status badges (Joined/Invited/Requested)
- See branch distribution and constraint progress

### 5. Browse & Join (`/team/browse`)

```
Student opens Browse Teams
        |
        v
Check: teamFormationOpen gate
        |
    +---+---+
    |       |
  Open    Closed
    |       |
    v       v
Fetch public  "Team Formation
forming teams  Closed" (locked)
    |
    v
Filter/search by name, ID, branch
    |
    v
Click "Request to Join"
    |
    v
Create invites/{INV-XXXXXX} (type: "request")
Add as pending_request member in team
    |
    v
Team lead reviews in their team page
```

### 6. Invite Response (`/invite/[inviteId]`)

When a team lead invites a student:
- Student sees invite details (team name, lead name, current members)
- Accept: updates invite status, adds to team members, updates registration
- Reject: updates invite status, removes pending member from team

---

## Admin Flow

### 1. Login (`/admin`)

- Firebase email/password authentication
- Only authorized admin emails can access
- Responsive sidebar (desktop) / top tabs (mobile) navigation

### 2. Dashboard Tab

- **Total Registrations** — count of `registrations` collection
- **CSV Students** — count of `students` collection (imported records)
- **Teams Forming** — teams with status "forming"
- **Teams Full** — teams with status "full" or "locked"
- **Branch Distribution** — horizontal bar chart showing registrations per branch

### 3. Students Tab

Upload student master data via CSV:

```
Click/drag CSV file
        |
        v
Client-side parse (csvParser.ts)
        |
        v
Preview table (Name, USN, Mobile, Email, Branch)
        |
        v
"Upload X Students" button
        |
        v
Batch write to students/{USN}
(450 docs per Firestore batch)
        |
        v
Update config.csvLastUploadedAt
```

### 4. Registrations Tab

- Searchable, paginated table of all registered students
- Columns: Name, USN, Branch, Section, Team ID, Team Role
- **Export CSV** — downloads all data as `.csv`
- **Export XLS** — downloads all data as `.xlsx` (via xlsx library)
- **Reload Data** button for manual refresh

### 5. Teams Tab

- Filtered view of students who are assigned to teams
- Shows Team ID and Role (Lead/Member) columns

### 6. Admins Tab

- **Authorize Admin** — add email to admin whitelist
- **Authorized Staff** — list current admins with revoke option
- Cannot revoke your own admin access

### 7. Settings Tab

- **Registration Gate** — toggle student registrations open/closed
- **Team Formation Gate** — toggle team creation and joining open/closed
- **Danger Zone** — reset database (requires password re-authentication + type "reset database")
  - Deletes all `registrations`, `teams`, and `invites` documents
  - Does NOT delete `students` (CSV data) or `admins`

---

## Team Constraints

| Rule | Value | Enforcement |
|------|-------|-------------|
| Team size | Exactly **6** members | Hard block at 6 |
| Max same branch | **4** from one branch | Blocked when adding 5th |
| Min different branches | **2** unique branches | Checked at completion |
| EEE/ECE requirement | At least **1** member | Warning until 6th member, then hard block |

Constraints are validated in real-time during team building via `teamConstraints.ts`:
- `canAddMember(members, newBranch)` — checks before adding
- `validateTeamComposition(members)` — full validation
- `getBranchDistribution(members)` — returns `{ CSE: 2, IOT: 1, ... }`

---

## CSV Format

### Standard Format

```csv
Name,USN,Mobile,Email
Rahul Sharma,1DB25CS001,9876543210,rahul.s@dbit.in
Priya Patel,1DB25EC042,9123456789,priya.p@dbit.in
Arjun Kumar,1DB25IS100,8765432190,arjun.k@dbit.in
```

### Column Rules

| Column | Required | Notes |
|--------|----------|-------|
| `Name` | Yes | Student full name |
| `USN` | Yes | Must match format `1DB25XX###` |
| `Mobile` | No | 10-digit phone number. Also accepts header `Phone` |
| `Email` | No | Student email address |
| `Branch` | No | Auto-derived from USN if omitted |
| `Section` | No | Auto-derived from USN if omitted |

### Parsing Behavior

- Column order does not matter — matched by header name (case-insensitive)
- Handles quoted fields (`"Doe, John"` works correctly)
- Empty USN or Name rows are skipped with per-row error reporting
- Branch/section auto-derived from USN using DBIT 2025 section mapping
- Upload is batched at 450 docs per Firestore write (limit is 500)

---

## USN Format & Branch Mapping

USN format: `1DB25{BRANCH_CODE}{ROLL_NUMBER}`

| Code | Branch | Full Name |
|------|--------|-----------|
| `CS` | CSE | Computer Science & Engineering |
| `IC` | IOT | Internet of Things |
| `CI` | AI&ML | Artificial Intelligence & Machine Learning |
| `AD` | AI&DS | AI & Data Science |
| `IS` | ISE | Information Science & Engineering |
| `EC` | ECE | Electronics & Communication |
| `EE` | EEE | Electrical & Electronics |

### Section Mapping (DBIT 2025)

Sections are determined by branch code and roll number range:

| Branch | Roll Range | Section |
|--------|-----------|---------|
| CS | 001–059 | A |
| CS | 060–118 | B |
| CS | 119–177 | C |
| CS | 178–197 | D |
| IC | 001–037 | D |
| CI | 001–061 | E |
| CI | 062–100 | F |
| AD | 001–024 | F |
| AD | 025–087 | G |
| IS | 001–066 | I |
| IS | 067–130 | J |
| IS | 131–194 | K |
| EC | 001–053 | L |
| EC | 054–108 | M |
| EC | 109–163 | N |
| EE | 001–045 | P |

Example: `1DB25CS075` → Branch: **CSE**, Section: **B**

---

## Data Flows

### Registration Flow

```
[Student]                    [Firestore]
    |                            |
    |-- Enter USN ------------->|
    |                            |-- Check students/{USN}
    |<-- Auto-fill data --------|
    |                            |
    |-- Confirm & Submit ------>|
    |                            |-- Write registrations/{USN}
    |<-- Session created -------|
    |                            |
    |-- Redirect /dashboard     |
```

### Team Creation Flow

```
[Team Lead]                  [Firestore]
    |                            |
    |-- Create Team ----------->|
    |                            |-- Write teams/{TEAM-XXXX}
    |                            |-- Update registrations/{USN}.teamId
    |<-- Redirect to team ------|
```

### Invite Flow

```
[Team Lead]      [Firestore]      [Invitee]
    |                |                |
    |-- Invite USN ->|                |
    |                |-- Write        |
    |                |   invites/     |
    |                |   {INV-XXXX}   |
    |                |                |
    |                |<-- Open link --|
    |                |                |
    |                |-- Accept ----->|
    |                |   Update invite|
    |                |   Update team  |
    |                |   Update reg   |
```

### Join Request Flow

```
[Student]        [Firestore]      [Team Lead]
    |                |                |
    |-- Request ---->|                |
    |   Join         |-- Write        |
    |                |   invites/     |
    |                |   (type:       |
    |                |    request)    |
    |                |                |
    |                |<-- Approve? ---|
    |                |                |
    |<-- Added ------|   Update all   |
    |   to team      |   documents    |
```

### Admin CSV Upload Flow

```
[Admin]                      [Firestore]
    |                            |
    |-- Upload .csv file         |
    |                            |
    |-- Client-side parse        |
    |   (csvParser.ts)           |
    |                            |
    |-- Preview table shown      |
    |                            |
    |-- Confirm upload --------->|
    |                            |-- Batch write students/{USN}
    |                            |   (450 per batch)
    |                            |-- Update config.csvLastUploadedAt
    |<-- "X students imported" --|
```

---

## Gate Control System

Admins control two independent gates from the Settings tab:

| Gate | Controls | When Closed |
|------|----------|-------------|
| **Registration Gate** | `/register` page | Shows "Registrations Closed" with lock icon |
| **Team Formation Gate** | `/team/create` and `/team/browse` | Shows "Team Formation Closed" with lock icon |

Both gates are stored in `config/global_config` document:

```json
{
  "registrationsOpen": true,
  "teamFormationOpen": true,
  "csvLastUploadedAt": "..."
}
```

Gates take effect immediately — no restart required. Students see a locked state with a message explaining why access is restricted.

---

## Firestore Schema

### `students` (CSV-imported master data)

```
Document ID: USN (e.g., "1DB25CS001")
{
  usn: "1DB25CS001",
  name: "Rahul Sharma",
  email: "rahul.s@dbit.in",
  phone: "9876543210",
  branch: "CSE",           // auto-derived from USN
  section: "A",            // auto-derived from USN
  importedAt: Timestamp,
  importBatch: "batch_1710000000000"
}
```

### `registrations` (registered students)

```
Document ID: USN
{
  usn: "1DB25CS001",
  name: "Rahul Sharma",
  email: "rahul.s@dbit.in",
  phone: "9876543210",
  branch: "CSE",
  section: "A",
  teamId: "TEAM-A1B2" | null,
  teamRole: "lead" | "member" | null,
  registeredAt: Timestamp
}
```

### `teams` (self-organized teams)

```
Document ID: "TEAM-XXXX" (4 alphanumeric chars)
{
  teamId: "TEAM-A1B2",
  name: "Innovators" | null,
  leadUSN: "1DB25CS001",
  members: [
    { usn, name, branch, section, status: "approved"|"pending_invite"|"pending_request", joinedAt }
  ],
  memberCount: 3,
  status: "forming" | "full" | "locked",
  branchDistribution: { "CSE": 2, "ECE": 1 },
  isPublic: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `invites` (invite/request documents)

```
Document ID: "INV-XXXXXX" (6 alphanumeric chars)
{
  inviteId: "INV-A1B2C3",
  type: "invite" | "request",
  teamId: "TEAM-A1B2",
  teamName: "Innovators" | null,
  fromUSN: "1DB25CS001",
  fromName: "Rahul Sharma",
  toUSN: "1DB25EC042",
  toName: "Priya Patel",
  status: "pending" | "approved" | "rejected" | "expired",
  createdAt: Timestamp,
  respondedAt: Timestamp | null
}
```

### `config` (global configuration)

```
Document ID: "global_config"
{
  registrationsOpen: true,
  teamFormationOpen: true,
  csvLastUploadedAt: Timestamp
}
```

### `admins` (admin whitelist)

```
Document ID: email with @ and . replaced by _
{
  email: "admin@dbit.in"
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (admin only) |
| Styling | Custom CSS (Paper & Ink design system) |
| Icons | Lucide React |
| Export | xlsx library for .xlsx downloads |
| Session | localStorage-based student sessions |
| Fonts | Bebas Neue (headings), Instrument Sans (body) |

### Design System: Paper & Ink

Minimal, print-inspired aesthetic using CSS custom properties:

| Variable | Value | Usage |
|----------|-------|-------|
| `--ink` | `#0D0D0D` | Text, borders, primary actions |
| `--paper` | `#F2EFE9` | Background |
| `--paper2` | `#E8E4DD` | Secondary background |
| `--red` | `#E8341A` | Accent, errors, danger |
| `--muted` | `#7A7670` | Secondary text |
| `--line` | `rgba(13,13,13,0.12)` | Subtle borders |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx             # Root layout (fonts, global CSS)
│   ├── page.tsx               # Landing page
│   ├── globals.css            # All styles (Paper & Ink design system)
│   ├── register/page.tsx      # Student registration
│   ├── dashboard/page.tsx     # Student dashboard
│   ├── status/page.tsx        # USN status lookup
│   ├── join/page.tsx          # Legacy join redirect
│   ├── admin/page.tsx         # Admin panel (sidebar + tabs)
│   ├── team/
│   │   ├── create/page.tsx    # Create new team (gate-checked)
│   │   ├── browse/page.tsx    # Browse open teams (gate-checked)
│   │   └── [teamId]/page.tsx  # Team detail view
│   └── invite/
│       └── [inviteId]/page.tsx # Invite response page
├── components/
│   ├── Navbar.tsx                    # Shared nav (session-aware)
│   ├── SessionGuard.tsx              # Auth wrapper, redirects to /register
│   ├── StudentRegistrationForm.tsx   # USN-validated registration form
│   ├── TeamCard.tsx                  # Team card for browse grid
│   ├── TeamMemberList.tsx            # Member list with status badges
│   ├── TeamStatusBadge.tsx           # Forming/Full/Locked badge
│   ├── BranchConstraintIndicator.tsx # Visual branch slot display
│   ├── InviteManager.tsx             # Team lead: send invites by USN
│   ├── JoinRequestManager.tsx        # Team lead: approve/reject requests
│   ├── InviteResponseCard.tsx        # Accept/reject invite UI
│   ├── CSVUploader.tsx               # Admin CSV upload with preview
│   ├── AdminStats.tsx                # Dashboard stats cards (4-grid)
│   ├── StudentTable.tsx              # Searchable table with CSV/XLS export
│   └── StatusLookup.tsx              # USN lookup with team details
└── lib/
    ├── firebase.ts            # Firebase config (singleton)
    ├── types.ts               # All TypeScript interfaces
    ├── session.ts             # localStorage session management
    ├── teamConstraints.ts     # Team composition validation
    ├── csvParser.ts           # CSV parser (Name,USN,Mobile,Email)
    ├── xlsExport.ts           # XLS file generation
    ├── idGenerator.ts         # TEAM-XXXX and INV-XXXXXX generators
    ├── usnValidator.ts        # USN format, branch, section validation
    ├── validUSNs.ts           # Static USN list (legacy)
    └── matchingAlgorithm.ts   # Pair matching (legacy fallback)
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in Firebase config values

# Run development server
npm run dev
```

---

## Environment Variables

Create `.env.local` with your Firebase project config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Session Management

Student sessions use `localStorage` (key: `idealab_session`):

```json
{
  "usn": "1DB25CS001",
  "name": "Rahul Sharma",
  "email": "rahul.s@dbit.in",
  "branch": "CSE",
  "section": "A",
  "teamId": "TEAM-A1B2",
  "teamRole": "lead",
  "registeredAt": "2026-03-12T..."
}
```

- `SessionGuard` component wraps authenticated student pages
- Validates session against Firestore `registrations` on page load
- "Log out" clears session and redirects to `/`
- No Firebase Auth for students — admin-only auth

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| USN not in CSV | "USN not found in student database" — registration blocked |
| Network error on USN lookup | "Could not verify USN" — registration blocked |
| Team full (6 members) | Join/invite blocked |
| 5th same-branch member | `canAddMember()` returns false |
| Team complete without EEE/ECE | Warning during building, hard block at 6th member |
| Already on a team | "You're already on a team" with link to current team |
| Duplicate join request | "You already have a pending request for this team" |
| Race condition (team filled during invite) | Final `canAddMember()` check before Firestore write |
| CSV parse errors | Per-row error reporting with row numbers |
| Database reset | Requires password re-auth + confirmation phrase |
