// O @types/pdfmake não declara os pacotes de fontes padrão do PDF, que trazem
// apenas as métricas (.afm) e não embutem a fonte no arquivo gerado.
declare module 'pdfmake/build/standard-fonts/Times' {
  import type { TFontDictionary, TVirtualFileSystem } from 'pdfmake/interfaces'

  const fontContainer: {
    vfs: TVirtualFileSystem
    fonts: TFontDictionary
  }

  export default fontContainer
}
