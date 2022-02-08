/* eslint-disable import/no-extraneous-dependencies */
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { ValidationError } from '@parameter1/joi';
import entity from '../src/entity.js';
import { string, isSchema } from '../src/schema.js';
import common from './common.js';

describe('entity.js', () => {
  it('should pluralize and dasherize the collection name by default', () => {
    const ent1 = entity('Application');
    const ent2 = entity('UserEvent');

    expect(ent1.$get('collection')).to.equal('applications');
    expect(ent1.$values().collection).to.equal('applications');
    expect(ent2.$get('collection')).to.equal('user-events');
    expect(ent2.$values().collection).to.equal('user-events');
  });

  it('should use the entity name utility when setting the name');

  describe('name', () => {
    it('should add the plural version of the name', () => {
      ['UserEvents', 'user-event', 'userEvent', 'user event', 'user.event', 'UserEvent', 'User Event'].forEach((name) => {
        const ent = entity(name);
        expect(ent.$get('plural')).to.equal('UserEvents');
      });
    });
  });

  describe('prop', () => {
    it('should throw an error when the key is invalid', () => {
      common.testInvalidRequiredStrings((value) => {
        entity('foo').prop(value);
      });
    });
    it('should throw an error when an existing prop is already set', () => {
      expect(() => {
        entity('foo').prop('bar', string()).prop('bar', string());
      }).to.throw(Error, 'A value already exists for `props.bar`');
    });
    it('should throw an error when schema is not a Joi object', () => {
      [undefined, null, {}, string].forEach((schema) => {
        expect(() => {
          entity('foo').prop('bar', schema);
        }).to.throw(ValidationError);
      });
    });
    it('should camelize the prop name', () => {
      ['foo_bar', 'FooBar', 'foo-bar', 'foo bar', 'foo.bar', 'foo__bar'].forEach((name) => {
        const v = entity('foo').prop(name, string()).$has('props.fooBar');
        expect(v).to.equal(true);
      });
    });
    it('should set the schema', () => {
      const prop = entity('foo').prop('foo', string()).$get('props.foo');
      expect(isSchema(prop.schema)).to.equal(true);
    });
  });

  describe('props', () => {
    it('should throw an error when the values array is invalid', () => {
      ['', null, undefined, [], ['foo'], [{ name: null }], [{ schema: {} }]].forEach((values) => {
        expect(() => {
          const ent = entity('foo');
          ent.props(values);
        }).to.throw(ValidationError);
      });
    });

    it('should set the props', () => {
      const ent = entity('foo').props([
        { name: 'bar', schema: string() },
        { name: 'pull_request', schema: string() },
        { name: 'baz', schema: string() },
      ]);
      ['bar', 'pullRequest', 'baz'].forEach((name) => {
        const prop = ent.$get(`props.${name}`);
        expect(prop).to.be.an('object');
        expect(isSchema(prop.schema)).to.equal(true);
      });
    });
  });
});
