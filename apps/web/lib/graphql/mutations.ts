import { gql } from '@apollo/client/core';

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
    }
  }
`;

export const CREATE_CELL = gql`
  mutation CreateCell($projectId: ID!, $input: CreateCellInput!) {
    createCell(projectId: $projectId, input: $input) {
      id
      type
      code
      order
    }
  }
`;

export const UPDATE_CELL = gql`
  mutation UpdateCell($id: ID!, $input: UpdateCellInput!) {
    updateCell(id: $id, input: $input) {
      id
      code
      outputs {
        type
        data
      }
    }
  }
`;

export const DELETE_CELL = gql`
  mutation DeleteCell($id: ID!) {
    deleteCell(id: $id)
  }
`;

export const EXECUTE_CELL = gql`
  mutation ExecuteCell($id: ID!) {
    executeCell(id: $id) {
      success
      outputs {
        type
        data
      }
      error
    }
  }
`;
