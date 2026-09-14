const mongoose = require('mongoose');
const { Part, SiteConfig } = require('./src/models');
const { imageUrlFor, bannerUrlFor } = require('./src/part-image');

async function fixImages() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/autopartes_pro');
    const parts = await Part.find();
    
    for (const part of parts) {
      const localImage = imageUrlFor(part);
      if (part.image !== localImage) {
        await Part.updateOne({ _id: part._id }, { $set: { image: localImage } });
      }
    }
    console.log(`Se actualizaron las fotos de ${parts.length} productos con imágenes locales.`);

    const config = await SiteConfig.findOne();
    if (config && Array.isArray(config.banners)) {
      let changed = 0;
      for (const banner of config.banners) {
        if (banner.imageUrl && !banner.imageUrl.startsWith('/uploads/')) {
          banner.imageUrl = bannerUrlFor(banner.title || 'Banner', `banner-${changed}`);
          changed++;
        }
      }
      if (changed > 0) {
        await config.save();
        console.log(`Se actualizaron ${changed} banner(s) con imágenes locales.`);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

fixImages();