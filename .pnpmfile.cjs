module.exports = {
  hooks: {
    readPackage(pkg) {
      // Ensure we use the latest pnpm version
      if (pkg.engines && pkg.engines.pnpm) {
        pkg.engines.pnpm = '>=10.18.0'
      }
      return pkg
    }
  }
}
