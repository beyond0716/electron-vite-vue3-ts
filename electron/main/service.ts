// 配置类
class DownloadOption {
  // 首次运行
  public firstRun?: boolean;
  // 下载来源
  public dlSource?: string;
  // 线程类型
  public threadType?: string;
  // 下载间隔
  public dlInterval?: number;
  // 单批数量
  public batchLimit?: number;
  // 下载为html
  public dlHtml?: number;
  // 下载为markdown
  public dlMarkdown?: number;
  // 下载为pdf
  public dlPdf?: number;
  // 保存至mysql
  public dlMysql?: number;
  // 下载音频到本地
  public dlAudio?: number;
  // 下载图片到本地
  public dlImg?: number;
  // 跳过现有文章
  public skinExist?: number;
  // 是否保存元数据
  public saveMeta?: number;
  // 是否按公号名字归类
  public classifyDir?: number;
  // 是否添加原文链接
  public sourceUrl?: number;
  // 是否下载评论
  public dlComment?: number;
  // 是否下载回复
  public dlCommentReply?: number;
  // 下载范围
  public dlScpoe?: string;
  // 下载开始时间
  public startDate?: string;
  // 下载结束时间
  public endDate?: string;
  // 保存路径
  public savePath?: string;
  // 缓存路径
  public tmpPath?: string;
  // CA证书路径
  public caPath?: string;
  // mysql配置-主机
  public mysqlHost?: string;
  // mysql配置-端口
  public mysqlPort?: number;
  // mysql配置-用户名
  public mysqlUser?: string;
  // mysql配置-密码
  public mysqlPassword?: string;
  // 是否清洗markdown，并保存数据库
  public cleanMarkdown?: number;
  // 过滤规则
  public filterRule?: string;
}

// nodeWorker交互使用的通用消息响应类
class NodeWorkerResponse {
  public code: NwrEnum;
  public message: string;
  public data?: any;
  constructor(code: NwrEnum, message: string, data?) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}

// NodeWorkerResponse的code枚举类
enum NwrEnum {
  START, // 启动
  SUCCESS, // 成功，输出日志
  FAIL, // 失败，输出日志并失败处理
  ONE_FINISH, // 单个下载结束，输出日志并做结束处理
  BATCH_FINISH, // 多个下载结束，输出日志并做结束处理
  CLOSE, // 结束线程
  PDF, // 创建pdf
  PDF_FINISHED // 创建pdf完成
}

// 下载事件枚举类
enum DlEventEnum {
  ONE, // 下载单篇文章
  BATCH_WEB, // 微信接口批量下载
  BATCH_DB, // 数据库批量下载
  BATCH_SELECT // 批量选择下载
}

export { DownloadOption, NodeWorkerResponse, NwrEnum, DlEventEnum };
