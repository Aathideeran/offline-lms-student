/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course, LocalDocument, PersonalNote, SyncMetadata, UpcomingEvent } from '../types/lms';

export const INITIAL_SYNC_METADATA: SyncMetadata = {
  lastBaselineSnapshotAt: '2026-10-26T18:30:00.000Z',
  lastSyncAttemptAt: null,
  lastSuccessfulSyncAt: '2026-10-26T18:30:00.000Z',
  connectionStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline_browser' : 'online_browser',
  lmsBridgeStatus: 'unconfigured_local_only',
  pendingMutationCount: 0,
};

export const INITIAL_UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: 'evt-25ens311-retest',
    courseId: 'course-25enh311',
    courseName: '2029 -25ENH311 -CEP-I',
    title: '25ENS311-CEP 1-QUANTS & VERBAL RETEST-17/10/26 closes',
    dueDateIso: '2026-10-28T23:59:00',
    dueLabel: 'Tomorrow, 11:59 PM',
    dateGroupLabel: 'Wednesday, 28 October 2026',
    timeLabel: '23:59',
    activityType: 'quiz',
    actionLabel: 'Attempt quiz now',
    syncState: 'sample_baseline',
  },
  {
    id: 'evt-dbms-sql-checkpoint',
    courseId: 'course-dbms-2029',
    courseName: '2029 Database Management Systems',
    title: 'L1 - Practice - DB - 5 - SQL Commands Assessment closes',
    dueDateIso: '2026-10-30T17:00:00',
    dueLabel: 'Friday, 5:00 PM',
    dateGroupLabel: 'Friday, 30 October 2026',
    timeLabel: '17:00',
    activityType: 'quiz',
    actionLabel: 'Attempt quiz now',
    syncState: 'sample_baseline',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-sem-exams-2029',
    code: '2029-SEM-EXAMS',
    title: '2029 Semester Exams',
    displayTitle: '2029 Semester Exams',
    category: 'Training',
    bannerPattern: 'pixel_gray',
    lastAccessedAt: '2026-10-27T07:30:00.000Z',
    syncState: 'sample_baseline',
    isSampleData: true,
    sections: [
      {
        id: 'sec-sem-general',
        courseId: 'course-sem-exams-2029',
        title: 'General',
        order: 1,
        expanded: true,
        items: [
          {
            id: 'item-sem-guidelines',
            sectionId: 'sec-sem-general',
            courseId: 'course-sem-exams-2029',
            title: 'SIET Autonomous Examination Guidelines & Code Execution Rules',
            type: 'document',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-25T10:00:00.000Z',
            contentSummary: 'Official regulations for offline and lab-proctored programming evaluations at SIET.',
            contentBody: `# SIET Autonomous Examination Guidelines (2029 Batch)

## 1. Evaluation Overview
The Sri Shakthi Institute of Engineering and Technology Learning Management System (SIET-LMS) hosts structured programming evaluations, database design assessments, and quantitative aptitude tests.

## 2. Offline Study & Sync Policy
When working in SIET-LMS Offline mode:
- Course materials, ER diagram specifications, SQL command references, and practice MCQs are cached in your browser's local IndexedDB database.
- Any completion status toggles ("Done" / "Mark as done"), quiz attempts, or personal study notes are recorded in your local modification queue.
- Local changes remain strictly on your device until an authorized campus LMS synchronization bridge is connected. The interface never fabricates remote server confirmation.

## 3. Programming & Database Lab Standards
- All SQL queries must adhere to ANSI SQL-92 / PostgreSQL syntax conventions taught in 2029 Database Management Systems.
- Primary keys, foreign keys, and referential integrity constraints must be explicitly declared in DDL statements.`,
          },
          {
            id: 'item-sem-mock-1',
            sectionId: 'sec-sem-general',
            courseId: 'course-sem-exams-2029',
            title: 'Semester Readiness Practice Check - Core CS & DBMS',
            type: 'quiz',
            done: false,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-25T10:00:00.000Z',
            contentSummary: 'Diagnostic practice quiz covering relational algebra, ER modeling, and time complexity.',
            contentBody: 'Complete the diagnostic check below to verify your offline exam readiness.',
            questions: [
              {
                id: 'q-sem-1',
                prompt: 'In an Entity-Relationship (ER) diagram, how is a weak entity set graphically represented?',
                options: [
                  'A dashed rectangle',
                  'A double-outlined rectangle connected to an identifying relationship represented by a double diamond',
                  'A diamond inside a circle',
                  'An ellipse with a double underline',
                ],
                correctIndex: 1,
                explanation: 'A weak entity set lacks sufficient attributes to form a primary key on its own and is drawn as a double rectangle linked to a double diamond (identifying relationship).',
              },
              {
                id: 'q-sem-2',
                prompt: 'Which SQL command belongs to the Data Definition Language (DDL) category?',
                options: ['SELECT', 'INSERT', 'ALTER', 'UPDATE'],
                correctIndex: 2,
                explanation: 'DDL (Data Definition Language) includes CREATE, ALTER, DROP, and TRUNCATE, which define or modify database schema structures.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'course-dbms-2029',
    code: '2029-DBMS',
    title: '2029 Database Management Systems',
    displayTitle: '2029 Database Management Sy...',
    category: 'Training',
    bannerPattern: 'waves_blue',
    lastAccessedAt: '2026-10-27T08:15:00.000Z',
    syncState: 'sample_baseline',
    isSampleData: true,
    sections: [
      {
        id: 'sec-dbms-general',
        courseId: 'course-dbms-2029',
        title: 'General',
        order: 0,
        expanded: false,
        items: [
          {
            id: 'item-dbms-syllabus',
            sectionId: 'sec-dbms-general',
            courseId: 'course-dbms-2029',
            title: '2029 Database Management Systems - Course Syllabus & Lab Manual',
            type: 'document',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-20T09:00:00.000Z',
            contentSummary: 'Syllabus covering ER modeling, Relational Keys, DDL/DML/TCL/DCL SQL commands, and Relational Operators.',
            contentBody: `# 2029 Database Management Systems — Course Syllabus

## Module 1: Conceptual Modeling & ER Diagrams
- Entities, Attributes (Simple, Composite, Single-valued, Multi-valued, Derived).
- Relationships, Degree of Relationship (Unary, Binary, Ternary), Cardinality Ratios (1:1, 1:N, M:N).
- Participation Constraints (Total vs. Partial participation) and Weak Entity Sets.

## Module 2: Relational Model & Keys
- Super Key, Candidate Key, Primary Key, Alternate Key, Foreign Key, Composite Key, and Surrogate Key.
- Entity Integrity Rule (Primary key cannot be NULL) and Referential Integrity Constraint.

## Module 3: SQL Commands (DDL, DML, DCL, TCL, DQL)
- DDL: CREATE, ALTER, DROP, TRUNCATE, RENAME.
- DML: INSERT, UPDATE, DELETE.
- DQL: SELECT with WHERE, GROUP BY, HAVING, ORDER BY.
- TCL: COMMIT, ROLLBACK, SAVEPOINT.

## Module 4: SQL Operators & Joins
- Arithmetic, Comparison, Logical (AND, OR, NOT), and Special Operators (BETWEEN, IN, LIKE, IS NULL).
- Set Operators: UNION, UNION ALL, INTERSECT, EXCEPT/MINUS.`,
          },
        ],
      },
      {
        id: 'sec-dbms-er',
        courseId: 'course-dbms-2029',
        title: 'ER Diagram',
        order: 1,
        expanded: true,
        items: [
          {
            id: 'item-er-part1',
            sectionId: 'sec-dbms-er',
            courseId: 'course-dbms-2029',
            title: 'ER Diagram Part 1',
            type: 'link',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-22T11:20:00.000Z',
            contentSummary: 'Introduction to Entities, Attributes, and Chen notation symbols in ER modeling.',
            contentBody: `# ER Diagram Part 1: Entities & Attributes

## 1. What is an ER Diagram?
An Entity-Relationship (ER) diagram visually models the structure of a database before relational tables are created. Introduced by Peter Chen (1976), it uses standardized geometric shapes:
- **Rectangle**: Represents an **Entity Set** (e.g., \`Student\`, \`Course\`, \`Department\`).
- **Ellipse (Oval)**: Represents an **Attribute** (e.g., \`roll_no\`, \`name\`, \`date_of_birth\`).
- **Diamond**: Represents a **Relationship Set** linking entities (e.g., \`Enrolls_In\`).

## 2. Classification of Attributes
1. **Simple vs. Composite Attributes**:
   - *Simple*: Cannot be subdivided further (e.g., \`gender\`, \`semester\`).
   - *Composite*: Composed of multiple sub-attributes (e.g., \`full_name\` -> \`first_name\`, \`last_name\`; \`address\` -> \`street\`, \`city\`, \`pincode\`).
2. **Single-Valued vs. Multi-Valued Attributes**:
   - *Single-Valued*: Holds a single atomic value per entity instance (e.g., \`register_number\`).
   - *Multi-Valued*: Can hold multiple values for a single entity; drawn with a **double ellipse** (e.g., \`phone_numbers\`, \`email_addresses\`).
3. **Stored vs. Derived Attributes**:
   - *Derived*: Computed dynamically from another stored attribute; drawn with a **dashed ellipse** (e.g., \`age\` calculated from \`date_of_birth\`).`,
          },
          {
            id: 'item-er-part2',
            sectionId: 'sec-dbms-er',
            courseId: 'course-dbms-2029',
            title: 'ER Diagram Part 2',
            type: 'link',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-22T14:10:00.000Z',
            contentSummary: 'Cardinality constraints (1:1, 1:N, M:N), Total vs. Partial participation, and Weak Entities.',
            contentBody: `# ER Diagram Part 2: Cardinality & Participation Constraints

## 1. Mapping Cardinalities
Cardinality specifies the maximum number of relationship instances in which an entity can participate:
- **One-to-One (1:1)**: Each \`Department\` has one \`HOD\` (Head of Department), and each \`HOD\` heads one \`Department\`.
- **One-to-Many (1:N)**: One \`Department\` employs many \`Faculty\` members, but each \`Faculty\` member belongs to one primary \`Department\`.
- **Many-to-Many (M:N)**: A \`Student\` enrolls in multiple \`Courses\`, and each \`Course\` has multiple enrolled \`Students\`.

## 2. Participation Constraints
- **Total Participation (Double Line)**: Every entity in the entity set *must* participate in at least one relationship instance. For example, every \`CourseSection\` must belong to a \`Course\`.
- **Partial Participation (Single Line)**: Some entities may not participate in the relationship. For example, not every \`Faculty\` member is an \`HOD\`.

## 3. Weak Entity Sets
A **Weak Entity** does not possess sufficient attributes to form a primary key independently.
- Represented by a **Double Rectangle**.
- Identified via a **Partial Key (Discriminator)**, underlined with a **dashed line**.
- Always exhibits **Total Participation** in its identifying relationship (**Double Diamond**) with its owner/strong entity.`,
          },
          {
            id: 'item-er-content',
            sectionId: 'sec-dbms-er',
            courseId: 'course-dbms-2029',
            title: 'ER Diagram Content',
            type: 'link',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-23T09:15:00.000Z',
            contentSummary: 'ER-to-Relational Schema Mapping rules for converting diagrams into SQL tables.',
            contentBody: `# ER Diagram Content: ER-to-Relational Mapping Algorithm

## Step-by-Step Reduction to Relational Tables
1. **Strong Entity Sets**: Create a table for each strong entity set. Include all simple attributes and the simple components of composite attributes.
2. **Weak Entity Sets**: Create a table including all attributes of the weak entity plus the primary key of the identifying strong entity (as a foreign key with \`ON DELETE CASCADE\`). The primary key of the weak table is the combination of \`(strong_entity_pk, partial_key)\`.
3. **1:1 Relationships**: Include the primary key of one entity as a foreign key in the other (prefer the side with Total Participation to avoid NULL values).
4. **1:N Relationships**: Place the primary key of the "1" side as a foreign key inside the table on the "N" (Many) side.
5. **M:N Relationships**: Create a separate **Junction (Bridge) Table** whose primary key is the composite of the foreign keys referencing both participating entities, along with any descriptive relationship attributes.
6. **Multi-Valued Attributes**: Create a dedicated new table containing the primary key of the entity (as a foreign key) and the multi-valued attribute itself; both columns together form the composite primary key.`,
          },
          {
            id: 'item-er-mcq',
            sectionId: 'sec-dbms-er',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 1 - ER MCQ',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-23T16:40:00.000Z',
            contentSummary: 'Level 1 MCQ Practice on ER Diagrams, attribute notations, and relational reduction.',
            contentBody: 'Practice Level 1 MCQs on Entity-Relationship Diagrams.',
            questions: [
              {
                id: 'q-er-1',
                prompt: 'How is a derived attribute such as "Age" (computed from Date of Birth) represented in standard Chen ER notation?',
                options: ['Double ellipse', 'Dashed ellipse', 'Rectangle with rounded corners', 'Underlined text inside an oval'],
                correctIndex: 1,
                explanation: 'Derived attributes are drawn using a dashed ellipse, whereas multi-valued attributes use a double ellipse.',
              },
              {
                id: 'q-er-2',
                prompt: 'When mapping a Many-to-Many (M:N) binary relationship between Student and Course into relational tables, how many total tables are required?',
                options: [
                  '2 tables (Student and Course, with foreign keys in each)',
                  '3 tables (Student, Course, and an Enrollment junction table)',
                  '1 combined universal table',
                  '4 tables',
                ],
                correctIndex: 1,
                explanation: 'An M:N relationship requires a 3rd junction/bridge table containing foreign keys referencing the primary keys of both Student and Course.',
              },
              {
                id: 'q-er-3',
                prompt: 'In an ER diagram, a double line connecting an Entity Set to a Relationship Diamond indicates:',
                options: ['One-to-One cardinality', 'Partial participation', 'Total participation', 'A derived relationship'],
                correctIndex: 2,
                explanation: 'A double line signifies Total Participation (existence dependency), meaning every entity in that set must participate in at least one relationship instance.',
              },
            ],
          },
        ],
      },
      {
        id: 'sec-dbms-keys',
        courseId: 'course-dbms-2029',
        title: 'Keys',
        order: 2,
        expanded: true,
        items: [
          {
            id: 'item-keys-part1',
            sectionId: 'sec-dbms-keys',
            courseId: 'course-dbms-2029',
            title: 'Keys Part 1',
            type: 'link',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-24T10:00:00.000Z',
            contentSummary: 'Definitions and formal distinctions between Super Key, Candidate Key, Primary Key, Alternate Key, and Foreign Key.',
            contentBody: `# Keys Part 1: Relational Keys & Integrity Constraints

## 1. Taxonomy of Relational Keys
- **Super Key (SK)**: Any attribute or set of attributes that uniquely identifies a tuple (row) in a relation. If \`{roll_no}\` is unique, then \`{roll_no}\`, \`{roll_no, name}\`, and \`{roll_no, dept, email}\` are all Super Keys.
- **Candidate Key (CK)**: A **minimal** Super Key — meaning no proper subset of it is also a Super Key. A relation can have multiple Candidate Keys (e.g., \`roll_no\` and \`aadhaar_no\`).
- **Primary Key (PK)**: The single Candidate Key chosen by the database designer as the principal identifier for tuples in a table.
  - **Entity Integrity Rule**: No attribute participating in a Primary Key is allowed to accept \`NULL\` values.
- **Alternate Key (Secondary Key)**: Any Candidate Key that was *not* selected as the Primary Key (\`Alternate Keys = Candidate Keys - {Primary Key}\`).
- **Foreign Key (FK)**: An attribute (or set of attributes) in one relation $R_1$ (referencing relation) that references the Primary Key of another (or the same) relation $R_2$ (referenced relation).
  - **Referential Integrity**: A Foreign Key value must either match an existing Primary Key value in the referenced table or be wholly \`NULL\` (if permitted).`,
          },
          {
            id: 'item-keys-samples',
            sectionId: 'sec-dbms-keys',
            courseId: 'course-dbms-2029',
            title: 'Keys Sample Questions',
            type: 'link',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-24T12:30:00.000Z',
            contentSummary: 'Worked examples on counting Super Keys and validating Foreign Key referential actions.',
            contentBody: `# Keys Sample Questions & Worked Solutions

## Example 1: Counting Super Keys
**Question**: Let a relation $R(A, B, C, D, E)$ have a single Candidate Key $A$. How many distinct Super Keys exist for $R$?
**Solution**:
Every Super Key must contain the Candidate Key $A$. The remaining $5 - 1 = 4$ attributes $(B, C, D, E)$ can each either be included or excluded independently.
Therefore, total number of Super Keys = $2^{n - k} = 2^{5 - 1} = 2^4 = 16$.

## Example 2: Referential Integrity Actions
**Question**: What happens when a parent row in \`Department(dept_id)\` is deleted while \`Student(dept_id)\` references it with \`ON DELETE SET NULL\`?
**Solution**:
Assuming \`Student.dept_id\` is not part of the \`Student\` primary key and allows NULLs, the DBMS automatically sets \`dept_id = NULL\` for all students previously assigned to that deleted department.`,
          },
          {
            id: 'item-keys-mcq',
            sectionId: 'sec-dbms-keys',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 2',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-24T15:00:00.000Z',
            contentSummary: 'Level 1 Practice Quiz on Candidate Keys, Primary Keys, and Referential Integrity.',
            contentBody: 'Verify your mastery of Relational Keys and Integrity Constraints.',
            questions: [
              {
                id: 'q-keys-1',
                prompt: 'Which statement accurately describes the relationship between Super Keys and Candidate Keys?',
                options: [
                  'Every Super Key is a Candidate Key, but not every Candidate Key is a Super Key.',
                  'Every Candidate Key is a minimal Super Key; therefore all Candidate Keys are Super Keys.',
                  'A table can have only one Candidate Key but multiple Primary Keys.',
                  'Candidate Keys cannot contain more than one attribute.',
                ],
                correctIndex: 1,
                explanation: 'A Candidate Key is a minimal Super Key (no proper subset is a Super Key). Thus every Candidate Key is a Super Key, though a Super Key with redundant attributes is not a Candidate Key.',
              },
              {
                id: 'q-keys-2',
                prompt: 'If a relation R(A, B, C, D) has 4 attributes and {A, B} is the only Candidate Key, how many Super Keys does R have?',
                options: ['2', '4', '8', '16'],
                correctIndex: 1,
                explanation: 'Since {A, B} must be present in every Super Key, the remaining 2 attributes (C and D) yield 2^2 = 4 Super Keys: {A,B}, {A,B,C}, {A,B,D}, and {A,B,C,D}.',
              },
            ],
          },
        ],
      },
      {
        id: 'sec-dbms-sql',
        courseId: 'course-dbms-2029',
        title: 'SQL Commands',
        order: 3,
        expanded: true,
        items: [
          {
            id: 'item-sql-db3',
            sectionId: 'sec-dbms-sql',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 3',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-25T11:00:00.000Z',
            contentSummary: 'DDL vs DML SQL command classification and schema modification syntax.',
            contentBody: 'Practice Exercise DB-3: DDL (CREATE, ALTER, DROP, TRUNCATE) vs DML (INSERT, UPDATE, DELETE).',
            questions: [
              {
                id: 'q-sql3-1',
                prompt: 'What is the key operational difference between DELETE and TRUNCATE in SQL?',
                options: [
                  'DELETE removes the table schema whereas TRUNCATE keeps the schema.',
                  'DELETE is a DML command that supports a WHERE clause to remove specific rows; TRUNCATE is a DDL command that removes all rows from a table without scanning individual row predicates.',
                  'TRUNCATE can filter rows using a WHERE clause.',
                  'DELETE cannot be rolled back inside a transaction.',
                ],
                correctIndex: 1,
                explanation: 'DELETE (DML) removes rows matching a WHERE condition and logs individual row deletions; TRUNCATE (DDL) deallocates data pages to quickly empty the entire table.',
              },
            ],
          },
          {
            id: 'item-sql-db4',
            sectionId: 'sec-dbms-sql',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 4',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-25T14:20:00.000Z',
            contentSummary: 'Aggregate functions (COUNT, SUM, AVG), GROUP BY, and HAVING clause filtering.',
            contentBody: 'Practice Exercise DB-4: SQL Aggregation and Grouping clauses.',
            questions: [
              {
                id: 'q-sql4-1',
                prompt: 'In an SQL SELECT query, why is the HAVING clause used instead of WHERE?',
                options: [
                  'HAVING sorts the output rows in descending order.',
                  'WHERE filters individual rows before grouping, whereas HAVING filters groups after GROUP BY and aggregate functions (like COUNT or AVG) are computed.',
                  'HAVING is faster than WHERE on indexed columns.',
                  'WHERE only works on string columns.',
                ],
                correctIndex: 1,
                explanation: 'WHERE predicates are evaluated per row prior to GROUP BY; HAVING predicates filter the resulting aggregated groups.',
              },
            ],
          },
          {
            id: 'item-sql-db5',
            sectionId: 'sec-dbms-sql',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 5',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-25T16:45:00.000Z',
            contentSummary: 'Transaction Control Language (COMMIT, ROLLBACK, SAVEPOINT) and DCL permissions.',
            contentBody: 'Practice Exercise DB-5: TCL and DCL SQL Statements.',
            questions: [
              {
                id: 'q-sql5-1',
                prompt: 'Which SQL command revokes previously granted privileges from a database user?',
                options: ['REMOVE', 'REVOKE', 'ROLLBACK', 'DENY_ALL'],
                correctIndex: 1,
                explanation: 'GRANT and REVOKE are the standard Data Control Language (DCL) commands for managing permissions.',
              },
            ],
          },
        ],
      },
      {
        id: 'sec-dbms-operators',
        courseId: 'course-dbms-2029',
        title: 'Operators',
        order: 4,
        expanded: true,
        items: [
          {
            id: 'item-op-db6',
            sectionId: 'sec-dbms-operators',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 6',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-26T09:10:00.000Z',
            contentSummary: 'Pattern matching with LIKE (% and _) and range filtering with BETWEEN.',
            contentBody: 'Practice Exercise DB-6: SQL Pattern Matching and Range Operators.',
            questions: [
              {
                id: 'q-op6-1',
                prompt: 'Which SQL WHERE predicate matches any student name whose second letter is "a"?',
                options: ["WHERE name LIKE 'a%'", "WHERE name LIKE '_a%'", "WHERE name LIKE '%a_'", "WHERE name = '?a*'"],
                correctIndex: 1,
                explanation: 'In SQL LIKE patterns, the underscore (_) matches exactly one single character, and the percent sign (%) matches zero or more characters.',
              },
            ],
          },
          {
            id: 'item-op-db7',
            sectionId: 'sec-dbms-operators',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 7',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-26T11:30:00.000Z',
            contentSummary: 'Three-valued logic with NULL values (IS NULL, IS NOT NULL, COALESCE).',
            contentBody: 'Practice Exercise DB-7: Handling NULL values and three-valued truth tables in SQL.',
            questions: [
              {
                id: 'q-op7-1',
                prompt: 'What does the expression (NULL = NULL) evaluate to in standard SQL?',
                options: ['TRUE', 'FALSE', 'UNKNOWN (which filters out the row in a WHERE clause)', 'Syntax Error'],
                correctIndex: 2,
                explanation: 'Comparisons with NULL using = or != yield UNKNOWN in SQL three-valued logic. Always use IS NULL or IS NOT NULL.',
              },
            ],
          },
          {
            id: 'item-op-db8',
            sectionId: 'sec-dbms-operators',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 8',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-26T14:00:00.000Z',
            contentSummary: 'Set operators: UNION vs UNION ALL, INTERSECT, and EXCEPT.',
            contentBody: 'Practice Exercise DB-8: Relational Set Operations in SQL.',
            questions: [
              {
                id: 'q-op8-1',
                prompt: 'How does UNION differ from UNION ALL in SQL?',
                options: [
                  'UNION eliminates duplicate rows from the combined result set, whereas UNION ALL retains all duplicates.',
                  'UNION ALL sorts the result automatically.',
                  'UNION works on tables with different numbers of columns.',
                  'There is no difference.',
                ],
                correctIndex: 0,
                explanation: 'UNION performs duplicate elimination (set union), while UNION ALL concatenates results without deduplication (bag union).',
              },
            ],
          },
          {
            id: 'item-op-db9',
            sectionId: 'sec-dbms-operators',
            courseId: 'course-dbms-2029',
            title: 'L1 - Practice - DB - 9',
            type: 'quiz',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-26T16:20:00.000Z',
            contentSummary: 'Inner Joins, Left/Right/Full Outer Joins, and Correlated Subqueries.',
            contentBody: 'Practice Exercise DB-9: Relational Joins and Subqueries.',
            questions: [
              {
                id: 'q-op9-1',
                prompt: 'Which join returns all rows from the left table and matched rows from the right table, filling NULLs when no match exists?',
                options: ['INNER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'CROSS JOIN'],
                correctIndex: 1,
                explanation: 'LEFT OUTER JOIN (or LEFT JOIN) preserves every row of the left relation and pads unmatched right-side attributes with NULL.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'course-25enh311',
    code: '2029-25ENH311-CEP-I',
    title: '2029 -25ENH311 -CEP-I',
    displayTitle: '2029 -25ENH311 -CEP-I',
    category: 'Training',
    bannerPattern: 'poly_teal',
    lastAccessedAt: '2026-10-27T08:00:00.000Z',
    syncState: 'sample_baseline',
    isSampleData: true,
    sections: [
      {
        id: 'sec-cep-quants',
        courseId: 'course-25enh311',
        title: 'Quants & Verbal Retest Module',
        order: 1,
        expanded: true,
        items: [
          {
            id: 'item-cep-formula-sheet',
            sectionId: 'sec-cep-quants',
            courseId: 'course-25enh311',
            title: '25ENS311 Quantitative Aptitude & Verbal Ability Reference Guide',
            type: 'document',
            done: true,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-17T10:00:00.000Z',
            contentSummary: 'Formulas for Time & Work, Ratios, Percentages, Syllogisms, and Reading Comprehension.',
            contentBody: `# 25ENS311 — Career Enhancement Program I (CEP-I): Quants & Verbal

## 1. Quantitative Aptitude Core Formulas
- **Time and Work**:
  - If person $A$ completes a task in $x$ days and person $B$ in $y$ days, together they finish in $\\frac{xy}{x+y}$ days.
  - Work Equivalence: $M_1 \\times D_1 \\times H_1 / W_1 = M_2 \\times D_2 \\times H_2 / W_2$.
- **Percentages & Profit/Loss**:
  - Successive percentage change of $a\\%$ and $b\\%$: $\\left(a + b + \\frac{ab}{100}\\right)\\%$.
  - Profit $\\% = \\frac{\\text{SP} - \\text{CP}}{\\text{CP}} \\times 100$.
- **Speed, Time, and Distance**:
  - Average speed for equal distances at speeds $u$ and $v$: $\\frac{2uv}{u+v}$.
  - Conversion: $1\\text{ m/s} = \\frac{18}{5}\\text{ km/hr} = 3.6\\text{ km/hr}$.

## 2. Verbal Ability & Logical Reasoning
- **Subject-Verb Agreement**: Collective nouns and singular indefinite pronouns (\`everyone\`, \`each\`, \`neither\`) take singular verbs. When subjects are joined by \`neither...nor\` or \`either...or\`, the verb agrees with the nearer subject.
- **Syllogisms**: Universal Affirmative ("All A are B"), Particular Affirmative ("Some A are B"). Never assume converse truth for Universal Affirmative ("All A are B" only guarantees "Some B are A").`,
          },
          {
            id: 'item-cep-retest-quiz',
            sectionId: 'sec-cep-quants',
            courseId: 'course-25enh311',
            title: '25ENS311-CEP 1-QUANTS & VERBAL RETEST-17/10/26',
            type: 'quiz',
            done: false,
            syncState: 'sample_baseline',
            lastModifiedAt: '2026-10-26T18:30:00.000Z',
            contentSummary: 'Scheduled retest closing Wednesday, 28 October 2026, 23:59.',
            contentBody: 'Complete the 25ENS311-CEP 1 Quants & Verbal Retest below. Your attempt will be saved in local storage and queued for synchronization.',
            questions: [
              {
                id: 'q-cep-1',
                prompt: 'Analyst A can complete a coding audit in 12 hours, and Analyst B can complete the same audit in 15 hours. Working together, how many hours will they take to finish the audit?',
                options: ['6 hours 20 minutes', '6 hours 40 minutes', '7 hours 15 minutes', '8 hours'],
                correctIndex: 1,
                explanation: 'Combined rate = 1/12 + 1/15 = (5 + 4)/60 = 9/60 = 3/20 per hour. Time = 20/3 hours = 6 hours 40 minutes.',
              },
              {
                id: 'q-cep-2',
                prompt: 'A train 150 meters long passes a telegraph pole in 10 seconds. What is the speed of the train in km/hr?',
                options: ['45 km/hr', '54 km/hr', '60 km/hr', '72 km/hr'],
                correctIndex: 1,
                explanation: 'Speed = 150 m / 10 s = 15 m/s. Converting to km/hr: 15 * (18/5) = 54 km/hr.',
              },
              {
                id: 'q-cep-3',
                prompt: 'Choose the grammatically correct sentence:',
                options: [
                  'Neither the project lead nor the developers was informed about the server migration.',
                  'Neither the project lead nor the developers were informed about the server migration.',
                  'Each of the submitted algorithms have passed the time limit.',
                  'Everyone in the lab are compiling their code.',
                ],
                correctIndex: 1,
                explanation: 'With "neither...nor", the verb agrees with the closer subject ("developers", plural -> "were").',
              },
            ],
          },
        ],
      },
    ],
  },
];

export const INITIAL_DOCUMENTS: LocalDocument[] = [
  {
    id: 'doc-dbms-er-keys-guide',
    courseId: 'course-dbms-2029',
    title: 'SIET DBMS Study Pack: ER Diagrams, Relational Keys & SQL Reference',
    fileName: 'SIET_2029_DBMS_ER_Keys_SQL_Notes.md',
    mimeType: 'text/markdown',
    sizeBytes: 4120,
    importedAt: '2026-10-26T18:30:00.000Z',
    isSampleBaseline: true,
    syncState: 'sample_baseline',
    chunkCount: 4,
    rawText: `# SIET 2029 Database Management Systems — Complete Study Reference

## Section 1: Entity-Relationship (ER) Diagrams
An Entity-Relationship (ER) diagram models real-world entities and the relationships among them.
- **Strong Entity**: Has its own Primary Key; drawn with a single rectangle.
- **Weak Entity**: Depends on an identifying strong entity for existence; drawn with a double rectangle and linked via a double diamond. Its partial key (discriminator) is underlined with a dashed line.
- **Attributes**:
  - Simple attribute: Atomic value, drawn as a single oval.
  - Composite attribute: Divided into sub-parts (e.g., Name -> First Name, Last Name).
  - Multi-valued attribute: Can store multiple values (e.g., Phone Numbers); drawn as a double oval.
  - Derived attribute: Computed at runtime (e.g., Age from DOB); drawn as a dashed oval.
- **Participation Constraints**: Total participation uses a double line (every entity must participate); Partial participation uses a single line.

## Section 2: Relational Keys & Integrity Rules
- **Super Key**: Any set of one or more attributes that uniquely identifies a row in a relation. If a relation has $n$ attributes and a single candidate key has $k$ attributes, there are $2^{n-k}$ super keys.
- **Candidate Key**: A minimal super key with no redundant attributes.
- **Primary Key**: The chosen candidate key used to uniquely identify tuples. By the Entity Integrity Rule, primary key attributes can never be NULL.
- **Alternate Key**: Any candidate key not selected as the primary key.
- **Foreign Key**: An attribute referencing the primary key of another table to enforce Referential Integrity.

## Section 3: SQL Command Categories (DDL, DML, DCL, TCL, DQL)
- **DDL (Data Definition Language)**: Defines database schema structure. Commands: CREATE, ALTER, DROP, TRUNCATE, RENAME. Note that TRUNCATE removes all rows by deallocating pages and cannot take a WHERE clause.
- **DML (Data Manipulation Language)**: Modifies table records. Commands: INSERT, UPDATE, DELETE.
- **DQL (Data Query Language)**: Retrieves tuples using SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY. Remember: WHERE filters rows before grouping; HAVING filters groups after aggregation.
- **TCL (Transaction Control Language)**: Manages ACID transactions. Commands: COMMIT, ROLLBACK, SAVEPOINT.
- **DCL (Data Control Language)**: Controls access permissions. Commands: GRANT, REVOKE.

## Section 4: SQL Operators & Three-Valued Logic
- **Pattern Matching**: The LIKE operator uses '%' to match zero or more characters and '_' to match exactly one character.
- **NULL Semantics**: Comparisons with NULL using '=' or '<>' evaluate to UNKNOWN. Always test with IS NULL or IS NOT NULL.
- **Set Operations**: UNION removes duplicate rows between two union-compatible queries, whereas UNION ALL retains duplicates. INTERSECT returns common rows, and EXCEPT returns rows in the first query not present in the second.`,
  },
  {
    id: 'doc-cep-quants-handbook',
    courseId: 'course-25enh311',
    title: '25ENS311 CEP-I Quantitative Aptitude & Verbal Retest Handbook',
    fileName: '25ENS311_CEP1_Quants_Verbal_Handbook.md',
    mimeType: 'text/markdown',
    sizeBytes: 2150,
    importedAt: '2026-10-26T18:30:00.000Z',
    isSampleBaseline: true,
    syncState: 'sample_baseline',
    chunkCount: 2,
    rawText: `# 25ENS311 CEP-I Quantitative Aptitude & Verbal Retest Handbook

## Quantitative Aptitude Shortcuts
1. **Combined Work Rate**: If A takes $x$ hours and B takes $y$ hours, together they take $\\frac{xy}{x+y}$ hours. Example: For 12 hours and 15 hours, combined time is $\\frac{12 \\times 15}{12 + 15} = \\frac{180}{27} = \\frac{20}{3}\\text{ hours} = 6\\text{ hours } 40\\text{ minutes}$.
2. **Train & Pole Crossing**: Time to cross a stationary pole = $\\frac{\\text{Length of Train}}{\\text{Speed of Train}}$. To convert $\\text{m/s}$ to $\\text{km/hr}$, multiply by $\\frac{18}{5}$. Example: $150\\text{ m}$ in $10\\text{ s} = 15\\text{ m/s} = 15 \\times 3.6 = 54\\text{ km/hr}$.
3. **Effective Percentage Change**: Two successive changes of $a\\%$ and $b\\%$ yield $\\left(a + b + \\frac{ab}{100}\\right)\\%$.

## Verbal Ability Rules for Retest (28 October 2026)
1. **Correlative Conjunctions**: In "neither...nor" and "either...or" constructions, the verb agrees in number with the noun/pronoun closest to it.
2. **Distributive Pronouns**: Words like "each", "everyone", "everybody", "either", and "neither" take singular verbs.`,
  },
];

export const INITIAL_NOTES: PersonalNote[] = [
  {
    id: 'note-initial-dbms',
    courseId: 'course-dbms-2029',
    activityItemId: 'item-keys-part1',
    title: 'Formula for counting Super Keys in DBMS',
    content: 'If a relation R has n attributes and a single candidate key consists of k attributes, total super keys = 2^(n - k). Double-check whether multiple candidate keys overlap using Principle of Inclusion-Exclusion ($|SK(CK_1) \\cup SK(CK_2)| = |SK(CK_1)| + |SK(CK_2)| - |SK(CK_1 \\cap CK_2)|$).',
    updatedAt: '2026-10-26T19:15:00.000Z',
    syncState: 'sample_baseline',
  },
];
