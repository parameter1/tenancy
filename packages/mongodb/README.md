# SSO Database Repositories

## Models

### Applications
Define high-level applications that are available in the P1 ecosystem.

Model objects of this type _cannot_ be created or modified by external users.

Unique key: `slug`

```js
const application = {
  _id: ObjectId(),
  slug: 'omeda',
  name: 'Omeda',
  date: {
    created: ISODate(),
    updated: ISODate(),
  },
};
```

### Users
Define the users within the P1 ecosystem. Users can manage organizations and be members of application instance workspaces. Users are unique by email and can log-in using a magic login link sent via email. Eventually passwords could be assigned as a secondary authentication method.


**Indexes**
- Unique
  - `email`
  - `email` + `organizations._id`
  - `email` + `workspaces._id`
- Other
  - `organizations._id`
  - `workspaces._id`
  - `date.created` (sort)
  - `date.updated` (sort)
  - `slug` (sort)


```js
const user = {
  _id: ObjectId(),
  email: 'jacob@parameter1.com',
  domain: 'parameter1.com',
  givenName: 'Jacob',
  familyName: 'Bare',
  slug: 'bare-jacob',
  date: {
    created: ISODate(),
    updated: ISODate(),
    lastSeen: ISODate(),
    lastLoggedIn: ISODate(),
  },
  verified: true,
  loginCount: 1,
  previousEmails: [],

  // lists all organizations this user manages.
  organizations: [
    {
      _id: ObjectId(),
      role: 'Owner',
      date: { created: ISODate(), updated: ISODate() },
    }
  ],

  // lists all workspaces this user is a member of.
  workspaces: [
    {
      _id: ObjectId(),
      role: 'Admin',
      date: { created: ISODate(), updated: ISODate() },
    },
  ],
};
```

### Organizations
Define high-level organizations that exist within the P1 ecosystem. Organizations ultimately use applications via application instances (and workspaces).

Model objects of this type _cannot_ be created or modified by external users.

**Indexes**
- Unique
  - `key`
- Other
  - `date.created` (sort)
  - `date.updated` (sort)
  - `slug` (sort)

```js
const organization = {
  _id: ObjectId(),
  key: 'acbm', // defaults to being generated off name, but can be changed
  name: 'AC Business Media',
  slug: 'ac-business-media', // always generated off name
  date: {
    created: ISODate(),
    updated: ISODate(),
  },
};
```

### Organization Managers (via `user::organizations`)
Define user-to-organization relationships that signify the organizations that a user can manage. Managers have a specific role that defines what they can manage within their org. Managers - depending on their role - can add/remove/update instance workspace members, can change the roles of other managers, and can invite additional users to manage their orgs. Managers don't have implicit access to instance workspaces and, instead, must either give themself access (if able), have another manager give them access, or receive access from P1.

### Workspaces
Define the instances of an organization applications. All application instances have a `default` workspace. Users must be directly assigned as members of a workspace in order to gain access to the workspace.

Model objects of this type _cannot_ be created or modified by external users.


**Indexes**
- Unique
  - `organization._id` + `application._id` + `key`
  - `application._id`
- Other
  - `date.created` (sort)
  - `date.updated` (sort)
  - `slug` (sort)

Unique key: `

```js
const workspace = {
  _id: ObjectId(),
  application: { _id: ObjectId() },
  organization: { _id: ObjectId() },
  key: 'default', // defaults to being generated off name, but can be changed
  name: 'Default',
  slug: 'default', // always generated off name

  urls: [
    { env: 'production', value: 'https://acbm.omeda.parameter1.com' },
    { env: 'development', value: 'http://omeda-acbm.dev.parameter1.com' },
  ],

  date: {
    created: ISODate(),
    updated: ISODate(),
  },
};
```

#### Workspace Members (via `user::workspaces`)
Define user-to-workspace relationships that signify the instance workspaces that a user is a member of. Each member of an instance workspace can be assigned specific roles and permissions. Only users that are members of an instance workspace can access the instance.