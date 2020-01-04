[![Build Status](https://drone.midgar.io/api/badges/Midgar/service/status.svg)](https://drone.midgar.io/Midgar/service)
[![Coverage](https://sonar.midgar.io/api/project_badges/measure?project=Midgar%3Aservice&metric=coverage)](https://sonar.midgar.io/dashboard?id=Midgar%3Aservice)

# @midgar/service

Système de services avec injection de dépendance pour [Midgar](https://github.com/midgarjs/midgar)

## Installation

```sh
$ npm i @midgar/service --save
```

Si tout s'est bien passé, un message de confirmation s'affiche:
```sh
#midgar-cli
@midgar/express added to plugins.js !
```

## Fonctionnement
Ajoute un dossier de plugin **midgar-services**: ./services/.

Les services sont chargés a l'appel de l'évènement **@midgar/midgar:afterLoadPlugins**

## Ficher service

### Function:

```js
export default {
  // Nom du service
  name: 'namespace:monService',
  // Le service s'initialiseras avant le service mid:express
  before: ['mid:express']
  // Service a injecter
  dependencies: [
    'mid:mongo'
  ],
  service: (mid, mongoService) => {
  ...
  }
}
```

### Class:
```js
// Nom du service
const name = 'namespace:monService'
// Le service s'initialiseras avant le service mid:express
const before = ['mid:express']
// Service a injecter
const dependencies: [
    'mid:mongo'
  ]

class MyService {
  constructor(mid, mongoService) {}

  init () {
    ...
  }
}

export default {
  name
  before,
  dependencies,
  service: MyService,
}
```

La methode init est appelé automatique lors de la création de l'instance du service.

## Get service

```js
const serviceInstance = mid.getService('namespace:monService')
```
