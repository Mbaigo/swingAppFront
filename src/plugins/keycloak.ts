import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: 'http://localhost:9090', // L'URL de ton serveur Keycloak
  realm: 'lex-couture',
  clientId: 'lex-fashion-front',
})

export default keycloak
