import { MongoClient } from '@parameter1/sso-mongodb-core';
import { EventStore } from '@parameter1/sso-mongodb-event-store';
import { NormalizedRepoManager } from '@parameter1/sso-mongodb-normalized';

import { MONGO_URL } from './env.js';
import pkg from '../package.js';

export const mongo = new MongoClient(MONGO_URL, {
  appname: `${pkg.name} v${pkg.version}`,
});

export const normalizedRepoManager = new NormalizedRepoManager({ mongo });
export const store = new EventStore({ mongo });