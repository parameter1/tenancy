import { isFunction as isFn } from '@parameter1/utils';
import { entityManager } from '../../mongodb.js';

export default async ({
  filter,
  disabledWhen,
  query,
  projection,
} = {}) => {
  const repo = entityManager.getMaterializedRepo('organization');
  const cursor = await repo.find({
    query: { ...query },
    options: { projection: { ...projection, name: 1, key: 1 }, sort: { slug: 1, _id: 1 } },
  });

  const orgs = await cursor.toArray();
  return orgs.filter((doc) => {
    if (isFn(filter)) return filter(doc);
    return true;
  }).map((doc) => ({
    name: `${doc.name} [${doc.key}]`,
    value: doc,
    disabled: isFn(disabledWhen) ? disabledWhen(doc) : false,
  }));
};
