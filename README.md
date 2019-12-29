![](https://ci.midgar.io/app/rest/builds/buildType:(id:Midgar_Service_Build)/statusIcon) [![Coverage](https://sonar.midgar.io/api/project_badges/measure?project=Midgar_Service&metric=coverage)](https://sonar.midgar.io/dashboard?id=Midgar_Services)

## @midgar/service

Système de services avec injection de dépendance pour [Midgar](https://www.npmjs.com/package/@midgar/midgar)

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
Ajoute un dossier de plugin midgar-services: ./services/
Les services sont chargés a l'appel de l'évènement @midgar/midgar:afterLoadPlugins

## Get service

```js
const serviceInstance = await mid.getService('myService')
```

## Service définition
Exemple de fichier service

Function:

```js
/**
 * Function
 */
function 
export default {
  dependencies: [
    'db'
  ],
  service: (mid, db) => {
  ...
  }
}
```

```js
/**
 * Class
 */
export default {
  dependencies: [
    'db'
  ]
  service: class MyService {
    constructor(mid, db) {}
  },
}
```
