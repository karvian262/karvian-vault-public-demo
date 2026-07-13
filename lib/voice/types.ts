export type VoiceProviderId="browser"|"openai"|"elevenlabs"|"azure";
export type VoiceOption={id:string;name:string;language?:string;gender?:string;previewUrl?:string;description?:string};
export type VoicePreferences={provider:VoiceProviderId;voice:string;speed:number;pitch:number;volume:number;language:"en-IN"|"hi-IN"|"auto"};
export type VoiceSynthesisRequest=VoicePreferences&{text:string};

export interface VoiceProvider{
 readonly id:VoiceProviderId;
 readonly name:string;
 isConfigured():Promise<boolean>;
 listVoices():Promise<VoiceOption[]>;
 synthesize(request:VoiceSynthesisRequest):Promise<Blob>;
}
