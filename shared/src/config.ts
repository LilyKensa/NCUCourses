export class Config {

  static readonly hostname = "huey.ckefgisc.org";
  static readonly serverPort = 5810;
  static readonly clientPort = 5811;

  static NCU = class NCUCOnfig {
    
    static readonly weekdays = "0123456".split("");
    static readonly clocks = "1234Z56789ABCD".split("");
  
    static readonly listEndpoint = "https://cis.ncu.edu.tw/Course/main/support/course.xml";
    static readonly detailEndpoint = "https://cis.ncu.edu.tw/Course/main/support/courseDetail.html";
  }
}