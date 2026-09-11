// Подтягивает module augmentation из @tanstack/start-client-core.
// Без него у createFileRoute нет опции `server` (серверные handlers) —
// tsc ругается «'server' does not exist in type ...».
// reference, а не import: в рантайм-бандл веба ничего не попадает.
/// <reference types="@tanstack/react-start" />
