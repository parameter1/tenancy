import { PropTypes } from '@sso/prop-types';

const {
  date,
  object,
  objectId,
  string,
} = PropTypes;

const actions = ['accept-org-member-invite', 'magic-login', 'reject-org-member-invite', 'send-login-link', 'logout'];

export default {
  action: string().valid(...actions),
  date: date(),
  data: object(),
  id: objectId(),
  ip: string().allow(null).empty(null),
  ua: string().allow(null).empty(null),
};
