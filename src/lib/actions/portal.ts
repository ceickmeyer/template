// Moves an element to <body> so position: fixed overlays (lightbox, toast)
// aren't trapped by an ancestor's transform/overflow — FeaturedTweet's hover
// transform made the lightbox render inside the card instead of full-screen.
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    }
  };
}
