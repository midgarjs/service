![](https://ci.midgar.io/app/rest/builds/buildType:(id:Midgar_Service_Build)/statusIcon) [![Coverage](https://sonar.midgar.io/api/project_badges/measure?project=Midgar_Service&metric=coverage)](https://sonar.midgar.io/dashboard?id=Midgar_Services)

## @midgar/service

Système de services avec injection de dépendance pour [Midgar](https://www.npmjs.com/package/@midgar/midgar)

## Installation

```sh
$ npm i @midgar/service --save
```

## Fonctionnement
Ajoute un dossier de plugin **midgar-services**: ./services/.

Les services sont chargés a l'appel de l'évènement **@midgar/midgar:afterLoadPlugins**

## Get service

```js
const serviceInstance = await mid.getService('myService')
```

## Service définition
Exemple de fichier service

### Function:

```js
export default {
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
// Service a injecter
const dependencies: [
    'db'
  ]

/**
 * Class
 */
class MyService {
  constructor(mid, db) {}

  init () {
    ...
  }
}

export default {
  dependencies,
  service: MyService,
}
```
