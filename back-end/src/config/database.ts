import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI no está definido en las variables de entorno');
    }

    const conn = await mongoose.connect(mongoURI);
    
    console.log(`MongoDB conectado: ${conn.connection.host}`);

    // Manejar eventos de conexión
    mongoose.connection.on('connected', () => {
      console.log('Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Error de conexión de Mongoose:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose desconectado de MongoDB');
    });

    // Manejar cierre de aplicación
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexión de Mongoose cerrada por cierre de aplicación');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;