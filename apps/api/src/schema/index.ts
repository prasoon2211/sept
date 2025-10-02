import gql from 'graphql-tag';

export const typeDefs = gql`
  type Query {
    hello: String
    projects: [Project!]!
    project(id: ID!): Project
  }

  type Mutation {
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!

    createCell(projectId: ID!, input: CreateCellInput!): Cell!
    updateCell(id: ID!, input: UpdateCellInput!): Cell!
    deleteCell(id: ID!): Boolean!

    executeCell(id: ID!): CellExecutionResult!
    markCellDependentsStale(cellId: ID!): StaleResult!
  }

  type StaleResult {
    staleCellIds: [ID!]!
    count: Int!
  }

  scalar DateTime

  type Project {
    id: ID!
    name: String!
    description: String
    cells: [Cell!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Cell {
    id: ID!
    projectId: ID!
    type: CellType!
    code: String
    outputs: [CellOutput!]
    order: String!
    reads: [String!]
    writes: [String!]
    executionState: String
    lastExecutedAt: DateTime
    createdAt: String!
    updatedAt: String!
  }

  enum CellType {
    PYTHON
    SQL
    MARKDOWN
    CHART
  }

  type CellOutput {
    type: String!
    data: String!
  }

  type CellExecutionResult {
    success: Boolean!
    outputs: [CellOutput!]!
    error: String
  }

  input CreateProjectInput {
    name: String!
    description: String
  }

  input UpdateProjectInput {
    name: String
    description: String
  }

  input CreateCellInput {
    type: CellType!
    code: String
    order: String!
  }

  input UpdateCellInput {
    type: CellType
    code: String
    order: String
    outputs: String
  }
`;
