import { parentPort, workerData } from 'worker_threads';
import { NwrEnum } from './service.js';

if (!parentPort) throw new Error('IllegalState');

// 接收消息，执行任务
parentPort.on('message', async (message: NodeWorkerResponse) => {
  if (message.code == NwrEnum.START) {
    // 初始化数据库连接
    await createMysqlConnection();

    // 下载单个文章
    if (dlEvent == DlEventEnum.ONE) {
      const url = workerData.data;
      const articleInfo = new ArticleInfo(null, null, url);
      await axiosDlOne(articleInfo);
      resp(NwrEnum.ONE_FINISH, '');
      finish();
    } else if (dlEvent == DlEventEnum.BATCH_WEB) {
      // 从微信接口批量下载
      GZH_INFO = workerData.data;
      await batchDownloadFromWeb();
    } else if (dlEvent == DlEventEnum.BATCH_DB) {
      // 从数据库批量下载
      await batchDownloadFromDb();
    } else if (dlEvent == DlEventEnum.BATCH_SELECT) {
      await batchDownloadFromWebSelect(workerData.data);
    }
  } else if (message.code == NwrEnum.PDF_FINISHED) {
    // pdf保存完成的回调
    const pdfKey = message.data || '';
    const resolve = PDF_RESOLVE_MAP.get(pdfKey);
    if (resolve) {
      resolve();
      PDF_RESOLVE_MAP.delete(pdfKey);
    }
  }
});

parentPort.postMessage(getFibonacciNumber(workerData.num));

function getFibonacciNumber(num) {
  if (num === 0) {
    return 0;
  } else if (num === 1) {
    return 1;
  } else {
    return getFibonacciNumber(num - 1) + getFibonacciNumber(num - 2);
  }
}
