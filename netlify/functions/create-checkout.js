import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const MATERIALS = {
  vinyl:{base:8.0,min:25,options:{hems:0.5,grommets:0.25}},
  aluminum:{base:15.0,min:40,options:{rounded_corners:5}},
  jbond:{base:12.0,min:35,options:{laminate:2.0}},
  acrylic:{base:18.0,min:50,options:{standoffs:10}},
  posters:{base:6.0,min:15,options:{}},
  magnets:{base:10.0,min:30,options:{}},
  canvas:{base:14.0,min:35,options:{}},
  banners:{base:7.0,min:20,options:{hems:0.5,grommets:0.25,wind_slits:1.0}},
  'business-cards':{base:0.15,min:25,options:{spot_gloss:0.05}},
  'yard-signs':{base:9.0,min:20,options:{h_stakes:1.5}}
};

function sqInToSqFt(w,h){return (w*h)/144;}

export async function handler(event){
  if(event.httpMethod!=='POST') return {statusCode:405,body:'Method Not Allowed'};
  try{
    const body=JSON.parse(event.body||'{}');
    const {materialId,materialName,widthIn,heightIn,quantity,options=[],customer={},notes='',attachments=[],shipTo=''}=body;
    const mat=MATERIALS[materialId]; if(!mat) return {statusCode:400,body:'Unknown material'};

    const area=Math.max(0,sqInToSqFt(widthIn,heightIn)); let price=Math.max(mat.min, area*mat.base);
    for(const key of options){const add=mat.options[key]; if(!add) continue; price += (add<2)?(area*add):add;}
    const totalCents=Math.round(price*quantity*100);
    const name=`${materialName} — ${widthIn}" x ${heightIn}" (${area.toFixed(2)} sq ft) × ${quantity}`;

    const session=await stripe.checkout.sessions.create({
      mode:'payment',
      payment_method_types:['card','us_bank_account'],
      line_items:[{price_data:{currency:'usd',product_data:{name},unit_amount:totalCents},quantity:1}],
      customer_email: customer.email || undefined,
      success_url:`${process.env.SUCCESS_URL||'http://localhost:8888'}/success.html`,
      cancel_url:`${process.env.CANCEL_URL||'http://localhost:8888'}/cancel.html`,
      metadata:{
        materialId,materialName,
        widthIn:String(widthIn),heightIn:String(heightIn),quantity:String(quantity),
        options:options.join(','),notes,
        name:customer.name||'',phone:customer.phone||'',
        shipTo: shipTo || '',
        attachments:(attachments||[]).join('|')
      }
    });
    return {statusCode:200,body:JSON.stringify({url:session.url})};
  }catch(err){console.error(err);return {statusCode:500,body:'Server error'};}
}