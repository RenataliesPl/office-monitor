// prosta definicja global dla sockjs-client
if (typeof window !== "undefined" && (window as any).global === undefined) {
    (window as any).global = window;
}
