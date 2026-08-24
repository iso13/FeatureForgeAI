declare module 'multiple-cucumber-html-reporter' {
  interface ReporterOptions {
    jsonDir: string;
    reportPath: string;
    reportName?: string;
    displayDuration?: boolean;
    displayReportTime?: boolean;
    pageTitle?: string;
    pageFooter?: string;
  }
  const reporter: {
    generate(options: ReporterOptions): void;
  };
  export default reporter;
}