"""Offline build-time translation with OPUS-MT (CC-BY-4.0).
Model: https://huggingface.co/Sams200/opus-mt-en-fr
Original: https://huggingface.co/Helsinki-NLP/opus-mt-en-fr
Only model weights/tokenizers are loaded; no downloaded Python code is executed.
"""
import json,pathlib,re,html
import ctranslate2,sentencepiece as spm
root='/tmp/monetizable-en-fr-model'
source_sp=spm.SentencePieceProcessor(model_file=root+'/source.spm')
target_sp=spm.SentencePieceProcessor(model_file=root+'/target.spm')
translator=ctranslate2.Translator(root,device='cpu',compute_type='int8',inter_threads=2,intra_threads=4)
def translate_batch(texts):
    tokens=[source_sp.encode(s,out_type=str) + ["</s>"] for s in texts]
    results=translator.translate_batch(tokens,beam_size=2,max_decoding_length=512,max_input_length=1024)
    return [target_sp.decode(r.hypotheses[0]) for r in results]
out=pathlib.Path('src/lib/messages-fr.json');dictionary=json.loads(out.read_text())
source=list(dict.fromkeys(json.loads(pathlib.Path('scripts/i18n/source-strings.json').read_text())+json.loads(pathlib.Path('scripts/i18n/template-strings.json').read_text())))
pending=[s for s in source if s not in dictionary]
for i in range(0,len(pending),24):
    batch=pending[i:i+24];dictionary.update(zip(batch,translate_batch(batch)))
    out.write_text(json.dumps(dictionary,ensure_ascii=False,indent=2)+'\n')
    print('UI',len(dictionary),'/',len(source),flush=True)
fr=pathlib.Path('content/posts-fr');fr.mkdir(exist_ok=True)
for file in pathlib.Path('content/posts').glob('*.json'):
    dest=fr/file.name
    if dest.exists():continue
    post=json.loads(file.read_text());parts=re.split('(<[^>]*>)',post['contentHtml'])
    indices=[i for i,p in enumerate(parts) if not p.startswith('<') and re.search('[A-Za-z]',p)]
    for start in range(0,len(indices),24):
        chunk=indices[start:start+24];values=translate_batch([html.unescape(parts[i]) for i in chunk])
        for i,t in zip(chunk,values):parts[i]=html.escape(t,quote=False)
    post['contentHtml']=''.join(parts)
    for key in ['title','seoTitle','description','heroAlt']:
        if post.get(key):post[key]=dictionary.get(post[key],translate_batch([post[key]])[0])
    dest.write_text(json.dumps(post,ensure_ascii=False,indent=2)+'\n');print('Post',file.name,flush=True)
