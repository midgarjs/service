[![Build Status](https://drone.midgar.io/api/badges/Midgar/service/status.svg)](https://drone.midgar.io/Midgar/service)
[![Coverage](https://sonar.midgar.io/api/project_badges/measure?project=Midgar%3Aservice&metric=coverage)](https://sonar.midgar.io/dashboard?id=Midgar%3Aservice)

# @midgar/service

Système de services avec injection de dépendance pour [Midgar](https://github.com/midgarjs/midgar)

## Installation

```sh
$ npm i @midgar/service --save
```

Si tout s'est bien passé, un message de confirmation s'affiche:
```
#midgar-cli
@midgar/controller added to plugins.js !
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
  // Service a injecter
  dependencies: [
    'db'
  ],
  service: (mid, db) => {
  ...
  }
}
```

### Class:
```js
// Nom du service
const name = 'namespace:monService'
// Service a injecter
const dependencies: [
    'db'
  ]

class MyService {
  constructor(mid, db) {}

  init () {
    ...
  }
}

export default {
  name
  dependencies,
  service: MyService,
}
```

La methode init est appelé automatique lors de la création de l'instance du service.

## Get service

```js
const serviceInstance = await mid.getService('namespace:monService')
```
