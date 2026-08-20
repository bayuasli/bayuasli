import chalk from "chalk";

export default function (conn, m) {
  const chatType = m.isGroup
    ? `\u{1F465} Grup (${chalk.yellow(m.sender)} : ${chalk.greenBright(m.pushname)})`
    : `\u{1F48C} Pribadi`;

  const time = new Date(m.timesTamp * 1000).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

  console.log(
    chalk.cyan(`\n┌─「 ${chalk.bold.cyan("\u{1F4E9} PESAN BARU")} 」`) +
      `\n${chalk.cyan("│")} ${chalk.red("❒")} \u{1F310} ${chalk.bold.green("Dari     :")} ${chalk.yellow(conn.getName(m.chat))} ${chalk.gray("(" + m.chat + ")")}` +
      `\n${chalk.cyan("│")} ${chalk.red("❒")} \u{1F4AC} ${chalk.bold.cyan("Tipe     :")} ${chalk.blueBright(chatType)}` +
      `\n${chalk.cyan("│")} ${chalk.red("❒")} \u{1F4AD} ${chalk.bold.magenta("Isi Pesan:")} ${chalk.cyan(m.body || m.type)}` +
      `\n${chalk.cyan("│")} ${chalk.red("❒")} \u{23F0} ${chalk.bold.yellow("Waktu    :")} ${chalk.greenBright(time)}` +
      `\n${chalk.cyan("└" + "─".repeat(38))}\n`,
  );
}
