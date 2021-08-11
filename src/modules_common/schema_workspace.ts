// For TypeScript
export type AvatarUrl = string;

export type Workspace = {
  id: string;
  name: string;
  date: {
    createdDate: string;
    modifiedDate: string;
  };
  version: number;
  avatars: AvatarUrl[];
};

// For RxDB
export const workspaceSchema = {
  title: 'Workspace Schema',
  description: 'RxSchema for workspaces of RxDesktop',
  version: 0,
  type: 'object',
  properties: {
    id: {
      type: 'string',
      primary: true,
    },
    name: {
      type: 'string',
    },
    date: {
      type: 'object',
      properties: {
        createdDate: {
          type: 'string',
        },
        modifiedDate: {
          type: 'string',
        },
      },
    },
    version: {
      type: 'number',
    },
    avatars: {
      type: 'array',
      ref: 'avatar', // refers to collection 'avatar'
      items: {
        type: 'string',
      },
    },
  },
};
