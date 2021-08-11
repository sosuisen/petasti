// For TypeScript
export type Card = {
  id: string;
  type: string;
  user: string;
  data: string;
  date: {
    createdDate: string;
    modifiedDate: string;
  };
  version: string;
};

// For RxDB
export const cardSchema = {
  title: 'Card Schema',
  description: 'RxSchema for cards of RxDesktop',
  version: 0,
  type: 'object',
  properties: {
    id: {
      type: 'string',
      primary: true,
    },
    type: {
      type: 'string',
    },
    user: {
      type: 'string',
    },
    data: {
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
  },
};
