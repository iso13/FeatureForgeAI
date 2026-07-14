module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/**/*.ts'],
    paths: ['src/**/*.feature'],
    format: ['progress'],
    publishQuiet: true
  }
}
