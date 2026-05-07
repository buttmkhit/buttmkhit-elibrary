# Security Specification - BUTTMKHIT e-Library

## Data Invariants
1. A document must have a title, author, tag, and type.
2. The tag must be one of the three quarantine categories.
3. The type must be 'Jurnal' or 'Laporan Uji Terap'.
4. Only the admin user (buttmkhithumas@gmail.com) can write to the database.
5. Everyone can read documents.

## The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Attempting to create a document without being logged in. (Expected: DENIED)
2. **Non-Admin Write**: Logged in as a regular user (not buttmkhithumas@gmail.com) and attempting to create. (Expected: DENIED)
3. **Missing Required Fields**: Creating a document without 'title'. (Expected: DENIED)
4. **Invalid Enum (Tag)**: Creating a document with tag 'Invalid Karantina'. (Expected: DENIED)
5. **Invalid Enum (Type)**: Creating a document with type 'Secret Report'. (Expected: DENIED)
6. **ID Poisoning**: Attempting to create a document with a 2KB long string as ID. (Expected: DENIED)
7. **Bypassing Server Timestamp**: Providing a manual client-side timestamp for `createdAt`. (Expected: DENIED)
8. **Impersonation**: Attempting to set `ownerId` to someone else's UID. (Expected: DENIED)
9. **Malicious Update**: Non-admin attempting to update a document title. (Expected: DENIED)
10. **Shadow Field Injection**: Adding an `isAdmin: true` field to a document. (Expected: DENIED)
11. **Resource Exhaustion**: Sending a 1MB string in the 'title' field. (Expected: DENIED)
12. **Unauthorized Deletion**: Regular user attempting to delete a document. (Expected: DENIED)
