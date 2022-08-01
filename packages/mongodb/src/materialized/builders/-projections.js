export function prepareProjection(projection, defaults = {}) {
  return Object
    .keys(projection).sort().reduce((o, key) => {
      const v = projection[key];
      return { ...o, [key]: v === 1 ? `$${key}` : v };
    }, { ...defaults });
}

export function projectAsNode(projection) {
  const node = prepareProjection(projection, { _id: '$_id' });
  return { _id: 0, node };
}

function metaProjection() {
  return prepareProjection({
    _meta: {
      created: '$__.created',
      modified: '$__.modified',
      touched: '$__.touched',
    },
  });
}

function commonFullProjection() {
  return prepareProjection({
    _deleted: '$__.isDeleted',
    _history: '$__.history',
    ...metaProjection(),
  });
}

function commonPartialProjection() {
  return prepareProjection({
    _deleted: '$__.isDeleted',
    ...metaProjection(),
  });
}

export function commonApplication() {
  return prepareProjection({
    key: 1,
    name: 1,
    roles: 1,
    slug: 1,
  });
}

export function fullApplication() {
  return prepareProjection({
    ...commonFullProjection(),
    ...commonApplication(),
  });
}

export function partialApplication() {
  return prepareProjection({
    ...commonPartialProjection(),
    ...commonApplication(),
  });
}