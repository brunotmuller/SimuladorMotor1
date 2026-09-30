# Welcome to your Expo app 👋

## Consulta por placa (Falcon Data Hub)

A consulta usa um backend Node separado porque a versão web é publicada como site estático. O token da Falcon fica somente nesse backend; `EXPO_PUBLIC_PLATE_API_URL` contém apenas o endereço público dele.

1. Copie `.env.example` para `.env` e preencha `FALCON_API_TOKEN` no arquivo local. O `.env` está ignorado pelo Git.
2. Em um terminal, execute `npm run api` (Node 20.19 ou superior).
3. Em outro terminal, execute `npm run web`. No desenvolvimento, o app chama `http://localhost:3001/api/vehicles`.
4. Para publicar, hospede o backend Node em um servidor HTTPS, configure `ALLOWED_ORIGINS` com a origem do site e defina `EXPO_PUBLIC_PLATE_API_URL` com o endereço público terminado em `/api/vehicles` **antes** de gerar a versão web.

O backend atende `GET /api/vehicles/:plate`, chama `GET https://beta.falcon-server.com.br/data-hub/private/v1/vehicles/:plate/search` com `Authorization: Bearer` e devolve apenas campos existentes na resposta. Se a Falcon retornar a URL de imagem, `GET /api/vehicles/:plate/image` serve a imagem por meio do backend. O token nunca deve receber o prefixo `EXPO_PUBLIC_`.

Sem um token válido, a consulta informa que o servidor não está configurado. As demais funções do simulador continuam disponíveis.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
