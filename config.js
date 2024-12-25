const config = {
    development: {
      serverUrl: 'http://localhost:3000'
    },
    production: {
      serverUrl: 'https://tradewithbredge.com'
    }
  };
  
  const environment = 'development'; // Change to 'production' for prod
  export const SERVER_URL = config[environment].serverUrl;
  