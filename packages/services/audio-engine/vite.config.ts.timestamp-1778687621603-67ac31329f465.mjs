// vite.config.ts
import { defineConfig } from "file:///C:/Users/user190825/practice/Membrana/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/user190825/practice/Membrana/node_modules/@vitejs/plugin-react/dist/index.js";
import dts from "file:///C:/Users/user190825/practice/Membrana/node_modules/vite-plugin-dts/dist/index.mjs";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
var __vite_injected_original_dirname = "C:\\Users\\user190825\\practice\\Membrana\\packages\\services\\audio-engine";
var __vite_injected_original_import_meta_url = "file:///C:/Users/user190825/practice/Membrana/packages/services/audio-engine/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src/**/*"],
      exclude: ["**/*.test.ts"],
      rollupTypes: true
    })
  ],
  resolve: {
    alias: {
      "@membrana/core": fileURLToPath(
        new URL("../../core/src/index.ts", __vite_injected_original_import_meta_url)
      )
    }
  },
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index"
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "@membrana/core"]
    },
    sourcemap: true,
    target: "es2022"
  },
  server: {
    port: 5175,
    open: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1c2VyMTkwODI1XFxcXHByYWN0aWNlXFxcXE1lbWJyYW5hXFxcXHBhY2thZ2VzXFxcXHNlcnZpY2VzXFxcXGF1ZGlvLWVuZ2luZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdXNlcjE5MDgyNVxcXFxwcmFjdGljZVxcXFxNZW1icmFuYVxcXFxwYWNrYWdlc1xcXFxzZXJ2aWNlc1xcXFxhdWRpby1lbmdpbmVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3VzZXIxOTA4MjUvcHJhY3RpY2UvTWVtYnJhbmEvcGFja2FnZXMvc2VydmljZXMvYXVkaW8tZW5naW5lL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGR0cyBmcm9tICd2aXRlLXBsdWdpbi1kdHMnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbi8qKlxuICogVml0ZSBsaWJyYXJ5LW1vZGUgXHUwNDNBXHUwNDNFXHUwNDNEXHUwNDQ0XHUwNDM4XHUwNDMzIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0NDFcdTA0MzVcdTA0NDBcdTA0MzJcdTA0MzhcdTA0NDFcdTA0MzAgQG1lbWJyYW5hL2F1ZGlvLWVuZ2luZS1zZXJ2aWNlLlxuICovXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBkdHMoe1xuICAgICAgaW5jbHVkZTogWydzcmMvKiovKiddLFxuICAgICAgZXhjbHVkZTogWycqKi8qLnRlc3QudHMnXSxcbiAgICAgIHJvbGx1cFR5cGVzOiB0cnVlLFxuICAgIH0pLFxuICBdLFxuXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0BtZW1icmFuYS9jb3JlJzogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTCgnLi4vLi4vY29yZS9zcmMvaW5kZXgudHMnLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICB9LFxuICB9LFxuXG4gIGJ1aWxkOiB7XG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaW5kZXgudHMnKSxcbiAgICAgIGZvcm1hdHM6IFsnZXMnXSxcbiAgICAgIGZpbGVOYW1lOiAnaW5kZXgnLFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0L2pzeC1ydW50aW1lJywgJ0BtZW1icmFuYS9jb3JlJ10sXG4gICAgfSxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgdGFyZ2V0OiAnZXMyMDIyJyxcbiAgfSxcblxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTc1LFxuICAgIG9wZW46IHRydWUsXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFksU0FBUyxvQkFBb0I7QUFDM2EsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sU0FBUztBQUNoQixTQUFTLGVBQWUsV0FBVztBQUNuQyxTQUFTLGVBQWU7QUFKeEIsSUFBTSxtQ0FBbUM7QUFBc04sSUFBTSwyQ0FBMkM7QUFTaFQsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sSUFBSTtBQUFBLE1BQ0YsU0FBUyxDQUFDLFVBQVU7QUFBQSxNQUNwQixTQUFTLENBQUMsY0FBYztBQUFBLE1BQ3hCLGFBQWE7QUFBQSxJQUNmLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxrQkFBa0I7QUFBQSxRQUNoQixJQUFJLElBQUksMkJBQTJCLHdDQUFlO0FBQUEsTUFDcEQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBRUEsT0FBTztBQUFBLElBQ0wsS0FBSztBQUFBLE1BQ0gsT0FBTyxRQUFRLGtDQUFXLGNBQWM7QUFBQSxNQUN4QyxTQUFTLENBQUMsSUFBSTtBQUFBLE1BQ2QsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxTQUFTLGFBQWEscUJBQXFCLGdCQUFnQjtBQUFBLElBQ3hFO0FBQUEsSUFDQSxXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
