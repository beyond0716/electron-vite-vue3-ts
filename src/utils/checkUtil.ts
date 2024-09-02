/*
 * 校验url
 */
export function checkUrl(url: string): boolean {
  const regex =
    /^(https?:\/\/)([0-9a-z.]+)(:[0-9]+)?([/0-9a-z.]+)?(\?[0-9a-z&=]+)?(#[0-9-a-z]+)?/i
  return regex.test(url)
}
