const markdownPatterns=[
 [/```[\s\S]*?```/g,"code snippet"],
 [/`([^`]+)`/g,"$1"],
 [/\[([^\]]+)\]\(([^)]+)\)/g,"$1"],
 [/https?:\/\/\S+/g,""],
 [/^[\s>*#-]+/gm,""],
 [/\*\*([^*]+)\*\*/g,"$1"],
 [/\*([^*]+)\*/g,"$1"],
] as const;

export function prepareSpeechText(input:string){
 let text=input.replace(/\r/g,"\n");
 for(const [pattern,replacement] of markdownPatterns)text=text.replace(pattern,replacement);
 return text.replace(/[•●▪▫â€¢â—â–ªâ–«]/g,"").replace(/[ \t]+/g," ").replace(/\s+([,.?!])/g,"$1").replace(/([,.?!])(?=\S)/g,"$1 ").replace(/\n{3,}/g,"\n\n").trim();
}

export function naturalSpeechChunks(input:string){
 const text=prepareSpeechText(input);
 if(!text)return [];
 const paragraphs=text.split(/\n{2,}/).map(item=>item.replace(/\s*\n\s*/g," ").trim()).filter(Boolean);
 const chunks:string[]=[];
 for(let index=0;index<paragraphs.length;index++){
  const paragraphChunks=chunkParagraph(paragraphs[index]);
  if(index<paragraphs.length-1&&paragraphChunks.length)paragraphChunks[paragraphChunks.length-1]+="\n";
  chunks.push(...paragraphChunks);
 }
 return chunks;
}

export function pauseForChunk(chunk:string,index:number,total:number){
 if(index>=total-1)return 0;
 if(/\n$/.test(chunk))return 350;
 if(/[?!]$/.test(chunk))return 260;
 if(/\.$/.test(chunk))return 260;
 if(/[,;:]$/.test(chunk))return 140;
 return 120;
}

function chunkParagraph(paragraph:string){
 const sentences=paragraph.match(/[^.?!]+[.?!]+(?:\s+|$)|[^.?!]+$/g)?.map(item=>item.trim()).filter(Boolean)||[paragraph];
 const chunks:string[]=[];
 let current="",sentenceCount=0;
 for(const sentence of sentences){
  const candidate=current?`${current} ${sentence}`:sentence;
  if(current&&(sentenceCount>=3||candidate.length>360)){pushChunk(chunks,current);current=sentence;sentenceCount=1}
  else{current=candidate;sentenceCount++}
 }
 pushChunk(chunks,current);
 return chunks.flatMap(chunk=>chunk.length>480?splitLongChunk(chunk):[chunk]);
}

function pushChunk(chunks:string[],value:string){
 const chunk=value.trim();
 if(chunk)chunks.push(chunk);
}

function splitLongChunk(chunk:string){
 const parts:string[]=[],phrases=chunk.split(/(?<=[,;:])\s+/);
 let current="";
 for(const phrase of phrases){
  const candidate=current?`${current} ${phrase}`:phrase;
  if(current&&candidate.length>360){pushChunk(parts,current);current=phrase}
  else current=candidate;
 }
 pushChunk(parts,current);
 return parts.flatMap(part=>part.length>520?splitByWords(part):[part]);
}

function splitByWords(chunk:string){
 const words=chunk.split(" "),parts:string[]=[];
 let current="";
 for(const word of words){
  const candidate=current?`${current} ${word}`:word;
  if(current&&candidate.length>420){pushChunk(parts,current);current=word}
  else current=candidate;
 }
 pushChunk(parts,current);
 return parts;
}
