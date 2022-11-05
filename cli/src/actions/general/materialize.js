import inquirer from 'inquirer';
import { entityMaterializerClient } from '../../clients/entity-materializer.js';

export default async () => {
  const questions = [
    {
      type: 'checkbox',
      name: 'entityTypes',
      message: 'Select the entity types to materialize',
      choices: async () => entityMaterializerClient.request('getEntityTypes'),
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to complete this action?',
      default: false,
    },
  ];

  const { entityTypes, confirm } = await inquirer.prompt(questions);
  if (!confirm || !entityTypes.length) return [];
  return new Map(await entityMaterializerClient.request('types', { entityTypes }));
};
