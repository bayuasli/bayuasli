export default {
  name: "business-manager",
  category: "core",
  command: [
    "catalog",
    "collec",
    "order",
    "addcatalog",
    "delcatalog",
    "upcatalog",
  ],
  settings: {
    owner: true,
    private: false,
    group: false,
    admin: false,
    botAdmin: false,
    loading: false,
    protected: true
  },

  run: async (conn, m) => {
    if (m.command === "catalog") {
      const result = await conn.getCatalog({ jid: conn.user.id });

      if (!result?.products?.length) {
        return m.reply("Belum ada produk di katalog.");
      }

      const teks = result.products
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} (ID: ${p.id})\nHarga: ${p.price} ${p.currency}`,
        )
        .join("\n\n");

      return m.reply(`Daftar Produk\n\n${teks}`);
    }

    if (m.command === "collec") {
      const result = await conn.getCollections(conn.user.id);

      if (!result?.collections?.length) {
        return m.reply("Belum ada koleksi produk.");
      }

      const teks = result.collections
        .map(
          (c, i) =>
            `${i + 1}. ${c.name} (ID: ${c.id}) - ${c.products?.length || 0} produk`,
        )
        .join("\n");

      return m.reply(`Daftar Koleksi\n\n${teks}`);
    }

    if (m.command === "order") {
      const [orderId, token] = m.text
        .trim()
        .split("|")
        .map((v) => v.trim());

      if (!orderId || !token) {
        return m.reply("Format salah.\nContoh: order idPesanan|token");
      }

      const detail = await conn.getOrderDetails(orderId, token);

      const teks = detail.products
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} x${p.quantity} - ${p.price} ${p.currency}`,
        )
        .join("\n");

      return m.reply(
        `Detail Pesanan\n\nID: ${orderId}\nTotal: ${detail.price?.total} ${detail.price?.currency}\n\n${teks}`,
      );
    }

    if (m.command === "addcatalog") {
      const [name, description, price, currency] = m.text
        .split("|")
        .map((v) => v?.trim());

      if (!name || !description || !price || !currency) {
        return m.reply(
          "Format salah.\n\n" +
            "Cara pakai:\n" +
            "1. Balas gambar produk dengan perintah:\n" +
            "   addcatalog nama|deskripsi|harga|mata_uang\n\n" +
            "Contoh:\n" +
            "   addcatalog Kaos Polos|Bahan cotton combed 30s|75000|IDR",
        );
      }

      if (!m.quoted?.isMedia) {
        return m.reply("Balas gambar produk untuk menambahkan ke katalog.");
      }

      const buffer = await m.quoted.download();

      const product = await conn.productCreate({
        name,
        description,
        price: parseInt(price),
        currency: currency.toUpperCase(),
        isHidden: false,
        images: [buffer],
      });

      return m.reply(
        `Produk berhasil ditambahkan ke katalog.\n\n` +
          `ID     : ${product.id}\n` +
          `Nama   : ${product.name}\n` +
          `Harga  : ${product.price} ${product.currency}`,
      );
    }

    if (m.command === "delcatalog") {
      const ids = m.text
        .trim()
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (!ids.length) {
        return m.reply(
          "Format salah.\n\n" +
            "Cara pakai:\n" +
            "   delcatalog idProduk\n" +
            "   delcatalog idProduk1,idProduk2\n\n" +
            "Gunakan perintah catalog untuk melihat ID produk.",
        );
      }

      const result = await conn.productDelete(ids);
      return m.reply(
        `Berhasil menghapus ${result.deleted} produk dari katalog.`,
      );
    }

    if (m.command === "upcatalog") {

      const [id, ...fields] = m.text.split("|").map((v) => v.trim());

      if (!id || !fields.length) {
        return m.reply(
          "Format salah.\n\n" +
            "Cara pakai:\n" +
            "   updatecatalog idProduk|field=nilai\n\n" +
            "Field yang tersedia: name, description, price, currency\n\n" +
            "Contoh:\n" +
            "   upcatalog 123456|name=Kaos Baru|price=85000",
        );
      }

      const update = {};
      for (const field of fields) {
        const [key, value] = field.split("=").map((v) => v.trim());
        if (!key || value === undefined) continue;
        update[key] = key === "price" ? parseInt(value) : value;
      }


      if (m.quoted?.isMedia) {
        const buffer = await m.quoted.download();
        update.images = [buffer];
      }

      const product = await conn.productUpdate(id, update);
      return m.reply(
        `Produk berhasil diperbarui.\n\n` +
          `ID     : ${product.id}\n` +
          `Nama   : ${product.name}`,
      );
    }
  },
};
