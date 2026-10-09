import { stubServer, restrictedPath } from './stub-server.mjs'

export function glabStub(options = {}) {
  return stubServer({ ...options, name: 'glab' })
}

export { restrictedPath }
