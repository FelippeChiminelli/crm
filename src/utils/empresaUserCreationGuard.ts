let creationDepth = 0

export function beginEmpresaUserCreation(): void {
  creationDepth += 1
}

export function endEmpresaUserCreation(): void {
  creationDepth = Math.max(0, creationDepth - 1)
}

export function isEmpresaUserCreationInProgress(): boolean {
  return creationDepth > 0
}
