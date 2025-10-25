module.exports = {
  dependencies: {
    'react-native-config': {
      platforms: {
        android: null, // 🔹 Ignora o build nativo do react-native-config
      },
    },
    'react-native-document-picker': {
      platforms: {
        android: null, // 🔹 Ignora também o JNI do document-picker
      },
    },
  },
};

