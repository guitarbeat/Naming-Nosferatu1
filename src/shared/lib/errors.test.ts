import { describe, expect, it } from "vitest";
import { isRpcSignatureError } from "./errors";

describe("isRpcSignatureError", () => {
	it('should return true when "function" and "does not exist" are in the message', () => {
		expect(isRpcSignatureError("function get_user does not exist")).toBe(true);
	});

	it('should return true when "function" and "no function matches" are in the message', () => {
		expect(isRpcSignatureError("no function matches the given name")).toBe(true);
	});

	it('should return true when "function" and "could not find" are in the message', () => {
		expect(isRpcSignatureError("could not find function update_record")).toBe(true);
	});

	it("should handle mixed case messages", () => {
		expect(isRpcSignatureError("Function DOES NOT EXIST")).toBe(true);
		expect(isRpcSignatureError("No Function MATCHES")).toBe(true);
		expect(isRpcSignatureError("COULD NOT FIND Function")).toBe(true);
	});

	it('should return false if "function" is missing', () => {
		expect(isRpcSignatureError("procedure does not exist")).toBe(false);
		expect(isRpcSignatureError("no method matches")).toBe(false);
		expect(isRpcSignatureError("could not find the object")).toBe(false);
	});

	it("should return false if the action phrase is missing", () => {
		expect(isRpcSignatureError("function executed successfully")).toBe(false);
		expect(isRpcSignatureError("error in function")).toBe(false);
		expect(isRpcSignatureError("invalid arguments for function")).toBe(false);
	});

	it("should return false for completely unrelated error messages", () => {
		expect(isRpcSignatureError("syntax error at or near select")).toBe(false);
		expect(isRpcSignatureError("relation users does not exist")).toBe(false);
		expect(isRpcSignatureError("null value in column violates not-null constraint")).toBe(false);
	});

	it("should return false for empty string", () => {
		expect(isRpcSignatureError("")).toBe(false);
	});
});
