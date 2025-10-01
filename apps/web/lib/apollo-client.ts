import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { env } from '../env';

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: env.NEXT_PUBLIC_API_URL,
  }),
  cache: new InMemoryCache(),
});
