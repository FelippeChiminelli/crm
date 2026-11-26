/**
 * pdfmake e as métricas da fonte passam de 1MB somados, então só entram por
 * import dinâmico: o custo é pago na primeira geração de PDF, não no load do CRM.
 */
let pdfMakePromise: Promise<any> | null = null

export async function loadPdfMake(): Promise<any> {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const [pdfMakeModule, timesModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/standard-fonts/Times'),
      ])

      const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
      const times = (timesModule as any).default ?? timesModule

      // Times é fonte padrão do PDF: não embute arquivo de fonte, ao contrário do vfs do Roboto.
      pdfMake.addVirtualFileSystem(times.vfs)
      pdfMake.setFonts(times.fonts)

      return pdfMake
    })()

    // Sem isso uma falha de rede no chunk ficaria em cache e nenhuma nova
    // tentativa de geração voltaria a funcionar.
    pdfMakePromise.catch(() => {
      pdfMakePromise = null
    })
  }

  return pdfMakePromise
}
