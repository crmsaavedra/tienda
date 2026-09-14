const mongoose = require('mongoose');
const { Part } = require('./src/models');

async function fixImages() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/autopartes_pro');
    const parts = await Part.find();
    
    for (const part of parts) {
      // Usar Picsum Photos con seed basado en el SKU para que la imagen sea siempre la misma pero garantizada de funcionar
      const newImage = `https://picsum.photos/seed/${part.sku}/600/400`;
      await Part.updateOne({ _id: part._id }, { $set: { image: newImage } });
    }
    console.log(`Se actualizaron las fotos de ${parts.length} productos con Picsum Photos.`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

fixImages();
