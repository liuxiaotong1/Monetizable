import data from '@/data/trading-posts.json';
import {SITE_URL} from './positioning';
export const blogPosts=data;
export function findBlogPost(slug:string){return blogPosts.find(post=>post.slug===slug);}
export function articleSchema(post:typeof blogPosts[number]){
 const url=`${SITE_URL}/blog/${post.slug}`;
 return {'@context':'https://schema.org','@graph':[{'@type':'BlogPosting','@id':url+'#article',url,mainEntityOfPage:url,headline:post.title,description:post.description,datePublished:post.date,dateModified:post.date,inLanguage:'en',image:[SITE_URL+post.hero],wordCount:post.words,timeRequired:`PT${post.readingMinutes}M`,keywords:post.tags.join(', '),author:{'@type':'Organization',name:'Monetizable',url:SITE_URL+'/about'},publisher:{'@type':'Organization',name:'Monetizable',url:SITE_URL}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Blog',item:SITE_URL+'/blog'},{'@type':'ListItem',position:2,name:post.title,item:url}]}]};
}
