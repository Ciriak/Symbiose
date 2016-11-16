## Symbiose

**Any suggestion / Bug ?**
[Please, report them here](https://github.com/Cyriaqu3/Symbiose/issues)

## Development

### Prerequisites

- [Node / NPM](https://nodejs.org/)
- [Bower](https://bower.io/)

### Compiling the sources

Clone the repo , open a terminal on the project folder and type :

```
npm install
```

### Working with the sources

Open a terminal on the project folder and type :

```
gulp
```
Stay with the terminal open the src folder will be compiled on fly.

For testing , you have to follow the instructions below.

### Run the app

Open a terminal on the project folder and type :

```
electron dist/app.js
```

Symbiose should start

### Packaging the App

Open a terminal on the project folder and type :

```
gulp build
```
The packaged software should be available in the folder */build* and the release package (with the setup) in */release*.
