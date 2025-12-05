import frontend from "./frontend";
import { throneworldBackend } from "./functions/throneworldGame";

const moduleDefinition = {
  id: "throneworld",
  frontend,
  backend: throneworldBackend,
};

export default moduleDefinition;
