Refresh response:

{
  "schemaVersion": 2,
  "definitionVersion": 1,
  "reportId": "sec-corp-2026-07-25",
  "panelCode": "sec-corp",
  "businessDate": "2026-07-25",
  "version": 17,
  "userId": "previousUser",
  "permissions": {
    "canEdit": true,
    "canSave": true
  },
  "columns": [
    {
      "snapshotId": "snapshot0830",
      "sodBalance": "1679335804.24",
      "occ": "-308824714.48"
    }
  ]
}

Update request:

{
  "schemaVersion": 2,
  "definitionVersion": 1,
  "expectedVersion": 17,
  "userId": "currentUser",
  "report": {
    "reportId": "sec-corp-2026-07-25",
    "panelCode": "sec-corp",
    "businessDate": "2026-07-25",
    "version": 17,
    "userId": "previousUser",
    "permissions": {
      "canEdit": true,
      "canSave": true
    },
    "columns": [
      {
        "snapshotId": "snapshot0830",
        "sodBalance": "1679335804.24",
        "occ": "-308824714.48"
      }
    ]
  }
}

Therefore:
PUT.report contains the same complete dataset returned by Refresh.
Snapshot and row signatures are identical.
PUT adds expectedVersion and the current update actor’s userId.
The HTTP If-Match: "17" header also carries the expected version.
report.userId remains the user who created the currently loaded version.
The successful PUT response uses exactly the same signature as the Refresh response.